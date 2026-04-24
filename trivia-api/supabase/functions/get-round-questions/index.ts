import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID } from '../_shared/validation.ts'

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const url = new URL(req.url)
  const roundId = url.searchParams.get('roundId')

  if (!roundId || !isValidUUID(roundId)) return errorResponse('Invalid roundId', 400)

  const supabase = createServiceClient()

  // Fetch round and verify ownership
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (roundError) return errorResponse('Failed to fetch round', 500)
  if (!round) return errorResponse('Round not found', 404)
  if (new Date(round.expires_at) < new Date()) return errorResponse('Round has expired', 410)
  if (round.status === 'completed') return errorResponse('Round already completed', 410)

  // Fetch round questions with question details
  const { data: roundQuestions, error: rqError } = await supabase
    .from('round_questions')
    .select(`
      position,
      question_id,
      question_bank (
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d
      )
    `)
    .eq('round_id', roundId)
    .order('position', { ascending: true })

  if (rqError || !roundQuestions) return errorResponse('Failed to fetch questions', 500)

  // Map to response format — deliberately omit correct_option
  const questions = roundQuestions.map(rq => ({
    position: rq.position,
    questionId: rq.question_id,
    questionText: (rq.question_bank as Record<string, string>).question_text,
    options: {
      a: (rq.question_bank as Record<string, string>).option_a,
      b: (rq.question_bank as Record<string, string>).option_b,
      c: (rq.question_bank as Record<string, string>).option_c,
      d: (rq.question_bank as Record<string, string>).option_d,
    },
  }))

  // Mark questions as presented (update presented_at for current question)
  const currentPosition = round.current_question_index
  await supabase
    .from('round_questions')
    .update({ presented_at: new Date().toISOString() })
    .eq('round_id', roundId)
    .eq('position', currentPosition)
    .is('presented_at', null)

  // Derive game mode for client rendering. is_blitz/is_survival already on the round;
  // streak is inferred from mode_config.target_streak presence (streak nodes set it).
  const modeConfig = (round.mode_config ?? {}) as Record<string, unknown>
  const hasStreakTarget = typeof modeConfig.target_streak === 'number'
  const gameMode: string = round.is_blitz
    ? 'blitz'
    : round.is_survival
      ? 'survival'
      : hasStreakTarget
        ? 'streak'
        : 'classic'

  return jsonResponse({
    roundId: round.id,
    category: round.category,
    difficulty: round.difficulty,
    currentPosition: round.current_question_index,
    livesRemaining: round.lives_remaining,
    hammers: round.hammers,
    shields: round.shields ?? 0,
    xpEarnedInRound: round.xp_earned_in_round ?? 0,
    streak: round.streak,
    maxStreak: round.max_streak ?? 0,
    scoringTimerMode: round.scoring_timer_mode ?? 'question',
    gameMode,
    modeConfig,
    expiresAt: round.expires_at,
    questions,
  })
})
