import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, isValidOption, parseBody } from '../_shared/validation.ts'
import { computeAnswerXp, createActiveScoringTimerSnapshot, levelFromXp } from '../_shared/scoring.ts'
import { GAME_CONSTANTS, type ActiveScoringTimerSnapshot } from '../_shared/types.ts'
import { incrementChallengeProgress } from '../_shared/challenges.ts'

interface SubmitAnswerBody {
  roundId?: unknown
  questionId?: unknown
  position?: unknown
  selectedOption?: unknown  // null = timeout
  timeTakenMs?: unknown
  activeTimer?: unknown
  useShield?: unknown
}

function isValidActiveTimerSnapshot(value: unknown): value is Partial<ActiveScoringTimerSnapshot> {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (candidate.mode !== undefined && candidate.mode !== 'question' && candidate.mode !== 'round') return false
  for (const key of ['durationMs', 'elapsedMs', 'remainingMs'] as const) {
    if (candidate[key] !== undefined && (typeof candidate[key] !== 'number' || candidate[key] < 0)) {
      return false
    }
  }
  return true
}

function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<SubmitAnswerBody>(req)
  if (body instanceof Response) return body

  // Validate inputs
  if (!isValidUUID(body.roundId)) return errorResponse('Invalid roundId', 400)
  if (!isValidUUID(body.questionId)) return errorResponse('Invalid questionId', 400)
  if (typeof body.position !== 'number' || body.position < 0 || body.position > 29) {
    return errorResponse('Invalid position', 400)
  }
  if (body.selectedOption !== null && !isValidOption(body.selectedOption)) {
    return errorResponse('Invalid selectedOption', 400)
  }
  if (typeof body.timeTakenMs !== 'number' || body.timeTakenMs < 0) {
    return errorResponse('Invalid timeTakenMs', 400)
  }
  if (body.activeTimer !== undefined && !isValidActiveTimerSnapshot(body.activeTimer)) {
    return errorResponse('Invalid activeTimer', 400)
  }
  if (body.useShield !== undefined && typeof body.useShield !== 'boolean') {
    return errorResponse('Invalid useShield', 400)
  }

  const supabase = createServiceClient()

  // Fetch round and verify ownership + status
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', body.roundId)
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (roundError) return errorResponse('Failed to fetch round', 500)
  if (!round) return errorResponse('Round not found', 404)
  if (round.status !== 'active') return errorResponse('Round is not active', 410)
  if (new Date(round.expires_at) < new Date()) return errorResponse('Round has expired', 410)

  // Verify question belongs to this round at this position
  const { data: rq, error: rqError } = await supabase
    .from('round_questions')
    .select('question_id, presented_at')
    .eq('round_id', body.roundId)
    .eq('position', body.position)
    .eq('question_id', body.questionId)
    .maybeSingle()

  if (rqError) return errorResponse('Failed to verify question', 500)
  if (!rq) return errorResponse('Question not found in this round at this position', 400)

  // Check this position hasn't already been answered
  const { data: existingAnswer } = await supabase
    .from('answers')
    .select('id')
    .eq('round_id', body.roundId)
    .eq('position', body.position)
    .maybeSingle()

  if (existingAnswer) return errorResponse('This question has already been answered', 400)
  if (body.position !== round.current_question_index) {
    return errorResponse('Question is out of sequence', 409)
  }

  // Look up the correct answer from the DB (NEVER trust client)
  const { data: question, error: qError } = await supabase
    .from('question_bank')
    .select('correct_option, explanation, difficulty')
    .eq('id', body.questionId)
    .single()

  if (qError || !question) return errorResponse('Question not found', 404)

  const isTimeout = body.selectedOption === null
  const isCorrect = !isTimeout && body.selectedOption === question.correct_option
  const shieldConsumed = body.useShield === true && !isTimeout && !isCorrect

  // Shield blocks a wrong manual selection without consuming the question.
  if (shieldConsumed) {
    const currentShields = round.shields ?? 0
    if (currentShields <= 0) {
      return errorResponse('No shields available', 400)
    }

    const { data: updatedRound, error: shieldError } = await supabase
      .from('rounds')
      .update({ shields: currentShields - 1 })
      .eq('id', body.roundId)
      .eq('shields', currentShields)
      .gt('shields', 0)
      .select('shields')
      .maybeSingle()

    if (shieldError) return errorResponse('Failed to consume shield', 500)
    if (!updatedRound) return errorResponse('Shield state changed, please retry', 409)

    return jsonResponse({
      shieldConsumed: true,
      blockedOption: body.selectedOption,
      shieldsRemaining: updatedRound.shields ?? 0,
    })
  }

  const timerMode = round.scoring_timer_mode ?? 'question'
  const nowMs = Date.now()
  const roundStartedAt = parseTimestamp(round.started_at)
  const questionPresentedAt = parseTimestamp(rq.presented_at)

  let elapsedMs: number
  if (timerMode === 'round') {
    if (!roundStartedAt) return errorResponse('Round timer unavailable', 500)
    elapsedMs = Math.max(0, nowMs - roundStartedAt.getTime())
  } else {
    const anchor = questionPresentedAt ?? (body.position === 0 ? roundStartedAt : null)
    if (!anchor) {
      return errorResponse('Question timer unavailable. Reload the round and try again.', 409)
    }
    elapsedMs = Math.max(0, nowMs - anchor.getTime())
  }

  const activeTimer = createActiveScoringTimerSnapshot({
    mode: timerMode,
    elapsedMs,
  })

  // Compute answer XP server-side.
  const xpBreakdown = computeAnswerXp({
    isCorrect,
    activeTimer,
    currentStreak: round.streak,
    difficulty: question.difficulty,
  })
  const xpGained = xpBreakdown.total

  // Determine new round state
  const newStreak = isCorrect ? xpBreakdown.newStreak : 0
  const streakBonus = isCorrect && newStreak > 0 && newStreak % 5 === 0
  // Use per-round max_lives for quest rounds; global cap otherwise
  const effectiveMaxLives = round.is_quest ? (round.max_lives ?? GAME_CONSTANTS.MAX_LIVES) : GAME_CONSTANTS.MAX_LIVES
  // Survival rounds are always one-life — streaks never award extra lives
  const atMaxLives = round.is_survival || round.lives_remaining >= effectiveMaxLives
  const lifeEarned = streakBonus && !atMaxLives
  const hammerEarned = streakBonus && atMaxLives
  const newLives = isCorrect
    ? Math.min(round.lives_remaining + (lifeEarned ? 1 : 0), effectiveMaxLives)
    : round.lives_remaining - 1
  const newHammers = Math.min((round.hammers ?? 0) + (hammerEarned ? 1 : 0), GAME_CONSTANTS.MAX_HAMMERS)
  const newRoundXp = (round.xp_earned_in_round ?? 0) + xpGained
  const newIndex = (body.position as number) + 1
  const isStreakMilestone = isCorrect && newStreak > 0 && newStreak % GAME_CONSTANTS.BLITZ_STREAK_THRESHOLD === 0
  const timeBonus = round.is_blitz && isStreakMilestone ? GAME_CONSTANTS.BLITZ_TIME_BONUS_MS : 0
  const newMaxStreak = Math.max(round.max_streak ?? 0, newStreak)

  // Streak-mode quest rounds end when the target streak is hit (success).
  // mode_config.target_streak is populated at round creation for streak nodes.
  const streakTarget = (round.mode_config as Record<string, unknown> | null)?.target_streak
  const streakTargetReached =
    typeof streakTarget === 'number' &&
    streakTarget > 0 &&
    newStreak >= streakTarget

  // Classic rounds end at QUESTIONS_PER_ROUND. Blitz, survival, and streak
  // rounds use the full question pool and end on other conditions.
  const isExtendedPool = round.is_blitz || round.is_survival || streakTarget !== undefined
  const isRoundOver =
    newLives <= 0 ||
    (!isExtendedPool && newIndex >= GAME_CONSTANTS.QUESTIONS_PER_ROUND) ||
    (isExtendedPool && newIndex >= GAME_CONSTANTS.BLITZ_QUESTIONS) ||
    streakTargetReached

  // Insert answer record
  const { error: answerError } = await supabase.from('answers').insert({
    round_id: body.roundId,
    question_id: body.questionId,
    position: body.position,
    selected_option: body.selectedOption as string | null,
    is_correct: isCorrect,
    time_taken_ms: body.timeTakenMs as number,
    points_awarded: xpGained,
    time_bonus: xpBreakdown.timeBonus,
    streak_bonus: xpBreakdown.streakBonus,
    streak_at_time: round.streak,
  })

  if (answerError?.code === '23505') {
    return errorResponse('This question has already been answered', 400)
  }
  if (answerError) return errorResponse('Failed to record answer', 500)

  // Update round state atomically
  const roundUpdates: Record<string, unknown> = {
    streak: newStreak,
    max_streak: newMaxStreak,
    lives_remaining: newLives,
    current_question_index: newIndex,
  }
  // Only write hammers if the column exists (migration may not be applied yet)
  if (round.hammers !== undefined) {
    roundUpdates.hammers = newHammers
  }
  if (round.xp_earned_in_round !== undefined) {
    roundUpdates.xp_earned_in_round = newRoundXp
  }
  if (timeBonus > 0) {
    roundUpdates.expires_at = new Date(new Date(round.expires_at).getTime() + timeBonus).toISOString()
  }
  if (isRoundOver) {
    roundUpdates.status = 'completed'
    roundUpdates.completed_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('rounds')
    .update(roundUpdates)
    .eq('id', body.roundId)
    .eq('current_question_index', body.position)

  if (updateError) return errorResponse('Failed to update round state', 500)

  if (!isRoundOver) {
    const { error: presentationError } = await supabase
      .from('round_questions')
      .update({ presented_at: new Date().toISOString() })
      .eq('round_id', body.roundId)
      .eq('position', newIndex)
      .is('presented_at', null)

    if (presentationError) return errorResponse('Failed to activate next question', 500)
  }

  // Update challenge progress (fire-and-forget)
  if (isCorrect) {
    incrementChallengeProgress(supabase, auth.userId, 'correct_answers').catch(() => {})
  }

  // Quest mode: award XP immediately per correct answer. Other modes award the
  // accumulated round XP at round submission so abandoned rounds do not grant XP.
  let newXp: number | undefined
  let newLevel: number | undefined
  let leveledUp = false

  // Apply XP booster multiplier (quest mode per-answer; classic handled in finish-round)
  const boostedXpGained = round.xp_booster_active ? Math.round(xpGained * 1.5) : xpGained

  if (round.is_quest && isCorrect) {
    const { data: user } = await supabase
      .from('users')
      .select('xp, level, coins')
      .eq('id', auth.userId)
      .single()

    if (user) {
      const updatedXp = user.xp + boostedXpGained
      const updatedLevel = levelFromXp(updatedXp)
      leveledUp = updatedLevel > user.level

      await supabase
        .from('users')
        .update({
          xp: updatedXp,
          level: updatedLevel,
          coins: (user.coins ?? 0) + boostedXpGained,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auth.userId)

      newXp = updatedXp
      newLevel = updatedLevel
    }
  }

  return jsonResponse({
    isCorrect,
    isTimeout,
    correctOption: question.correct_option,
    explanation: question.explanation,
    xpAwarded: xpGained,
    xpBreakdown: {
      base: xpBreakdown.base,
      timeBonus: xpBreakdown.timeBonus,
      difficultyBonus: xpBreakdown.difficultyBonus,
      streakBonus: xpBreakdown.streakBonus,
      difficultyMultiplier: xpBreakdown.difficultyMultiplier,
      comboMultiplier: xpBreakdown.comboMultiplier,
      total: xpBreakdown.total,
      timing: xpBreakdown.timing,
    },
    currentRoundXp: newRoundXp,
    currentStreak: newStreak,
    livesRemaining: newLives,
    hammersRemaining: newHammers,
    nextPosition: newIndex,
    isRoundOver,
    lifeEarned,
    hammerEarned,
    timeBonus,
    xpGained: round.is_quest ? boostedXpGained : xpGained,
    coinsEarned: round.is_quest && isCorrect ? boostedXpGained : 0,
    newXp,
    newLevel,
    leveledUp,
  })
})
