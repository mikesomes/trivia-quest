import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import {
  EASY_BASE_ANSWER_XP,
  computeRoundXpBreakdown,
  computeXpEarned,
  getDifficultyBonusXp,
  levelFromXp,
  xpToNextLevel as computeXpToNextLevel,
} from '../_shared/scoring.ts'
import { GAME_CONSTANTS, type Difficulty } from '../_shared/types.ts'
import { updateDayStreak } from '../_shared/streaks.ts'
import {
  checkAndAwardAchievements,
  thresholdConditions,
  GAMES_TARGETS,
  STREAK_TARGETS,
  BLITZ_TARGETS,
  DAY_STREAK_TARGETS,
  CATEGORY_MASTERY_TARGET,
} from '../_shared/achievements.ts'

const MAX_SESSION_ROUNDS = 50

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<{ roundId?: unknown; sessionRoundIds?: unknown }>(req)
  if (body instanceof Response) return body

  if (!isValidUUID(body.roundId)) return errorResponse('Invalid roundId', 400)

  // Validate optional sessionRoundIds (previous rounds in this session)
  let sessionRoundIds: string[] = []
  if (body.sessionRoundIds !== undefined) {
    if (!Array.isArray(body.sessionRoundIds) || body.sessionRoundIds.length > MAX_SESSION_ROUNDS) {
      return errorResponse(`sessionRoundIds must be an array of at most ${MAX_SESSION_ROUNDS} IDs`, 400)
    }
    if (!body.sessionRoundIds.every((id) => isValidUUID(id))) {
      return errorResponse('All sessionRoundIds must be valid UUIDs', 400)
    }
    sessionRoundIds = [...new Set(body.sessionRoundIds as string[])]
  }

  const supabase = createServiceClient()

  // Fetch completed round
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', body.roundId)
    .eq('user_id', auth.userId)
    .eq('status', 'completed')
    .maybeSingle()

  if (roundError) return errorResponse('Failed to fetch round', 500)
  if (!round) return errorResponse('Completed round not found', 404)
  // Check for duplicate XP submission
  const { data: existing } = await supabase
    .from('scores')
    .select('id, xp_earned, correct_count, session_xp_earned')
    .eq('round_id', body.roundId)
    .maybeSingle()

  // Fetch answers with question difficulty for accurate per-question XP
  const { data: answers } = await supabase
    .from('answers')
    .select('is_correct, time_bonus, streak_bonus, time_taken_ms, streak_at_time, question_id')
    .eq('round_id', body.roundId)

  const questionIds = (answers ?? []).map(a => a.question_id).filter(Boolean)
  const { data: questionDifficulties } = questionIds.length > 0
    ? await supabase.from('question_bank').select('id, difficulty').in('id', questionIds)
    : { data: [] }
  const difficultyById = Object.fromEntries((questionDifficulties ?? []).map(q => [q.id, q.difficulty]))

  const correctCount = (answers ?? []).filter(a => a.is_correct).length
  const timeBonusTotal = (answers ?? []).reduce((sum, a) => sum + (a.time_bonus || 0), 0)
  const streakBonusTotal = (answers ?? []).reduce((sum, a) => sum + (a.streak_bonus || 0), 0)

  // Compute values needed for achievement checks
  const longestStreak = (answers ?? []).reduce((max, a) => {
    if (!a.is_correct) return max
    return Math.max(max, (a.streak_at_time ?? 0) + 1)
  }, 0)

  const avgTimeTakenMs = (answers ?? []).length > 0
    ? (answers ?? []).reduce((sum, a) => sum + (a.time_taken_ms ?? 0), 0) / (answers ?? []).length
    : Infinity

  const todayEastern = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const { data: recentSubmissions } = await supabase
    .from('scores')
    .select('completed_at')
    .eq('user_id', auth.userId)
    .gte('completed_at', new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString())
  const isFirstRoundToday = !(recentSubmissions ?? []).some((row) =>
    new Date(row.completed_at).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) === todayEastern
  )

  // ── Session cumulative totals ─────────────────────────────────────────────
  // Pull XP for every previously completed round in this session.
  // All rows must belong to this user; any mismatch is silently excluded.
  let prevSessionXp = 0
  let prevSessionCorrect = 0

  if (sessionRoundIds.length > 0) {
    const { data: prevSubmissions } = await supabase
      .from('scores')
      .select('xp_earned, correct_count')
      .in('round_id', sessionRoundIds)
      .eq('user_id', auth.userId)

    for (const row of prevSubmissions ?? []) {
      prevSessionXp += row.xp_earned ?? 0
      prevSessionCorrect += row.correct_count ?? 0
    }
  }

  const answerXpTotals = (answers ?? []).reduce((totals, answer) => {
    if (!answer.is_correct) return totals
    const qDifficulty = difficultyById[answer.question_id] ?? round.difficulty
    totals.answerBase += EASY_BASE_ANSWER_XP
    totals.speedBonus += answer.time_bonus ?? 0
    totals.difficultyBonus += getDifficultyBonusXp(qDifficulty)
    totals.streakBonus += answer.streak_bonus ?? 0
    return totals
  }, { answerBase: 0, speedBonus: 0, difficultyBonus: 0, streakBonus: 0 })

  const xpBreakdown = computeRoundXpBreakdown({
    ...answerXpTotals,
    answeredCount: answers?.length ?? 0,
    correctCount,
    totalQuestions: 10,
    livesRemaining: round.lives_remaining,
    isDailyChallenge: round.is_daily_challenge,
    isFirstRoundToday,
  })

  // Insert round XP record.
  // XP is accumulated per answer in submit-answer so it can reflect speed,
  // difficulty, and streak. Recompute from answer records for rich breakdowns;
  // keep a legacy fallback for older rows with no answer XP shape.
  const accumulatedAnswerXp = round.xp_earned_in_round ?? 0
  const answerXpEarned = xpBreakdown.answerXp > 0 || correctCount === 0
    ? xpBreakdown.answerXp
    : accumulatedAnswerXp
  const baseXpEarned = answerXpEarned > 0 || correctCount === 0
    ? xpBreakdown.total
    : computeXpEarned(correctCount, round.difficulty as Difficulty, 10)

  // "One more round" momentum bonus — eligibility was already decided (and
  // locked in) server-side back at create-round time; just apply it here.
  const momentumBonusActive = round.momentum_bonus_active === true
  const momentumBonusXp = momentumBonusActive
    ? Math.round(baseXpEarned * GAME_CONSTANTS.MOMENTUM_BONUS_MULTIPLIER)
    : 0
  const xpEarned = baseXpEarned + momentumBonusXp
  const xpBreakdownFinal = momentumBonusXp > 0
    ? { ...xpBreakdown, momentumBonus: momentumBonusXp, total: xpBreakdown.total + momentumBonusXp }
    : xpBreakdown

  const completionBonusXp = Math.max(0, xpEarned - answerXpEarned)
  const sessionXpEarned = prevSessionXp + xpEarned
  const sessionRound = sessionRoundIds.length + 1

  // Shared by the pre-insert existence check above and the insert-time race
  // below: another request for this round already has a `scores` row (there
  // is a window between the SELECT and the INSERT), so recover the response
  // from what was actually persisted instead of failing the request.
  async function recoveredXpResponse(scoreRow: {
    id: string
    xp_earned: number | null
    correct_count: number | null
    session_xp_earned: number | null
  }) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('xp, level, total_games, total_correct, best_score, coins')
      .eq('id', auth.userId)
      .single()

    if (userError || !user) return errorResponse('Failed to fetch user', 500)

    const recoveredSessionXp = scoreRow.session_xp_earned ?? sessionXpEarned
    const recoveredCorrectCount = scoreRow.correct_count ?? correctCount
    const recoveredXpEarned = scoreRow.xp_earned ?? xpEarned
    const recoveredOldXp = Math.max(0, user.xp - recoveredXpEarned)
    const recoveredNewLevel = levelFromXp(user.xp)
    const recoveredOldLevel = levelFromXp(recoveredOldXp)

    const { count: betterXpSubmissions } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gt('session_xp_earned', recoveredSessionXp)

    return jsonResponse({
      submissionId: scoreRow.id,
      roundXp: recoveredXpEarned,
      correctCount: recoveredCorrectCount,
      xpEarned: recoveredXpEarned,
      newXp: user.xp,
      newLevel: recoveredNewLevel,
      leveledUp: recoveredNewLevel > recoveredOldLevel,
      newBestXp: recoveredSessionXp >= user.best_score,
      rank: (betterXpSubmissions ?? 0) + 1,
      xpToNextLevel: computeXpToNextLevel(user.xp),
      xpBreakdown: xpBreakdownFinal,
      newAchievements: [],
      sessionXpEarned: recoveredSessionXp,
      sessionCorrectCount: prevSessionCorrect + recoveredCorrectCount,
      sessionRound,
      recoveredSubmission: true,
    })
  }

  if (existing) return await recoveredXpResponse(existing)

  const { data: submission, error: submissionError } = await supabase
    .from('scores')
    .insert({
      round_id: body.roundId,
      user_id: auth.userId,
      category: round.category,
      difficulty: round.difficulty,
      total_score: xpEarned,
      correct_count: correctCount,
      total_questions: answers?.length ?? 10,
      time_bonus_total: timeBonusTotal,
      streak_bonus_total: streakBonusTotal,
      completed_at: round.completed_at || new Date().toISOString(),
      xp_earned: xpEarned,
      session_score: sessionXpEarned,
      session_xp_earned: sessionXpEarned,
      session_round: sessionRound,
    })
    .select()
    .single()

  if (submissionError?.code === '23505') {
    // Another request for this round won the race between the SELECT above
    // and this INSERT — score_round_unique (20240001000000_init_schema.sql)
    // rejected ours. Recover exactly like the pre-check path.
    const { data: raced } = await supabase
      .from('scores')
      .select('id, xp_earned, correct_count, session_xp_earned')
      .eq('round_id', body.roundId)
      .maybeSingle()
    if (raced) return await recoveredXpResponse(raced)
  }

  if (submissionError || !submission) return errorResponse('Failed to save XP', 500)

  // Fetch current user stats
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('xp, level, total_games, total_correct, best_score, coins, best_blitz_correct')
    .eq('id', auth.userId)
    .single()

  if (userError || !user) return errorResponse('Failed to fetch user', 500)

  // Quest rounds already write per-answer XP live; round submission adds only
  // completion-style bonuses. Other modes award the full amount here.
  const oldXpForLevel = round.is_quest ? Math.max(0, user.xp - answerXpEarned) : user.xp
  const newXp = round.is_quest ? user.xp + completionBonusXp : user.xp + xpEarned
  const oldLevel = levelFromXp(oldXpForLevel)
  const newLevel = levelFromXp(newXp)
  const leveledUp = newLevel > oldLevel
  // Best XP uses session XP so multi-round sessions are ranked properly.
  const newBestXp = sessionXpEarned > user.best_score
  const newTotalGames = user.total_games + 1

  // Coins awarded equal the XP earned this submission (1 XP = 1 coin)
  const coinsAwarded = round.is_quest ? completionBonusXp : xpEarned
  const newCoins = (user.coins ?? 0) + coinsAwarded

  // Blitz personal best (for blitz_15/25/35 achievements)
  const newBestBlitzCorrect = round.is_blitz
    ? Math.max(user.best_blitz_correct ?? 0, correctCount)
    : (user.best_blitz_correct ?? 0)

  // Update user stats
  const userUpdate: Record<string, unknown> = {
    total_games: newTotalGames,
    total_correct: user.total_correct + correctCount,
    best_score: newBestXp ? sessionXpEarned : user.best_score,
    coins: newCoins,
    best_blitz_correct: newBestBlitzCorrect,
  }
  if (!round.is_quest || completionBonusXp > 0) {
    userUpdate.xp = newXp
    userUpdate.level = newLevel
  }
  await supabase.from('users').update(userUpdate).eq('id', auth.userId)

  // Any completed round keeps the universal day streak alive
  const dayStreak = await updateDayStreak(supabase, auth.userId)

  // Category-mastery progress (submit-answer already incremented this per
  // correct answer during play — daily-challenge rounds are excluded there
  // since their round.category is only a majority approximation).
  let categoryCorrectCount = 0
  if (!round.is_daily_challenge) {
    const { data: categoryStat } = await supabase
      .from('user_category_stats')
      .select('correct_count')
      .eq('user_id', auth.userId)
      .eq('category', round.category)
      .maybeSingle()
    categoryCorrectCount = categoryStat?.correct_count ?? 0
  }

  // ── Achievement checks ─────────────────────────────────────────────────────
  const conditions: Record<string, boolean> = {
    first_game:    newTotalGames >= 1,
    ...thresholdConditions('games', GAMES_TARGETS, newTotalGames),
    perfect_round: correctCount === 10,
    speed_demon:   correctCount === 10 && avgTimeTakenMs < 8000,
    survivor:      round.lives_remaining === 1,
    ...thresholdConditions('streak', STREAK_TARGETS, longestStreak),
    high_scorer:   xpEarned >= 500,
    big_brain:     sessionXpEarned >= 1500,
    ...thresholdConditions('blitz', BLITZ_TARGETS, newBestBlitzCorrect),
    ...thresholdConditions('day_streak', DAY_STREAK_TARGETS, dayStreak?.currentStreak ?? 0),
    ...(!round.is_daily_challenge
      ? { [`category_master_${round.category}`]: categoryCorrectCount >= CATEGORY_MASTERY_TARGET }
      : {}),
  }

  const newAchievements = await checkAndAwardAchievements(supabase, auth.userId, conditions)
  // ──────────────────────────────────────────────────────────────────────────

  // Get current global rank (rank on session XP, matching the leaderboard views)
  const { count: betterXpSubmissions } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .gt('session_xp_earned', sessionXpEarned)

  const rank = (betterXpSubmissions ?? 0) + 1

  return jsonResponse({
    submissionId: submission.id,
    roundXp: xpEarned,
    correctCount,
    xpEarned,
    coinsEarned: coinsAwarded,
    newCoins,
    newXp,
    newLevel,
    leveledUp,
    newBestXp,
    rank,
    xpToNextLevel: computeXpToNextLevel(newXp),
    xpBreakdown: xpBreakdownFinal,
    newAchievements,
    sessionXpEarned: prevSessionXp + xpEarned,
    sessionCorrectCount: prevSessionCorrect + correctCount,
    sessionRound,
    dayStreak,
  })
})
