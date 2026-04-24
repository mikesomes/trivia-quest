import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import { incrementChallengeProgress } from '../_shared/challenges.ts'

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<{ roundId?: unknown }>(req)
  if (body instanceof Response) return body

  if (!isValidUUID(body.roundId)) return errorResponse('Invalid roundId', 400)

  const supabase = createServiceClient()

  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', body.roundId)
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (roundError) return errorResponse('Failed to fetch round', 500)
  if (!round) return errorResponse('Round not found', 404)

  // If still active, mark as completed
  if (round.status === 'active') {
    await supabase
      .from('rounds')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', body.roundId)
    incrementChallengeProgress(supabase, auth.userId, 'rounds_completed').catch(() => {})
  } else if (round.status !== 'completed') {
    return errorResponse(`Round is ${round.status} and cannot be finished`, 400)
  }

  // Fetch all answers for summary
  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select(`
      position,
      question_id,
      selected_option,
      is_correct,
      time_taken_ms,
      points_awarded,
      time_bonus,
      streak_bonus,
      question_bank (correct_option)
    `)
    .eq('round_id', body.roundId)
    .order('position', { ascending: true })

  if (answersError) return errorResponse('Failed to fetch answers', 500)

  const correctCount = (answers ?? []).filter(a => a.is_correct).length
  const totalSpeedBonus = (answers ?? []).reduce((sum, a) => sum + (a.time_bonus || 0), 0)
  const totalStreakBonus = (answers ?? []).reduce((sum, a) => sum + (a.streak_bonus || 0), 0)
  const totalAnswerXp = (answers ?? []).reduce((sum, a) => sum + (a.points_awarded || 0), 0)
  const baseRoundXp = round.xp_earned_in_round ?? totalAnswerXp
  const roundXp = round.xp_booster_active ? Math.round(baseRoundXp * 1.5) : baseRoundXp

  // Calculate longest streak
  let longestStreak = 0
  let currentStreak = 0
  for (const a of (answers ?? [])) {
    if (a.is_correct) {
      currentStreak++
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return jsonResponse({
    roundId: round.id,
    category: round.category,
    difficulty: round.difficulty,
    xpEarned: roundXp,
    xpBoosterApplied: round.xp_booster_active ?? false,
    correctCount,
    totalQuestions: (answers ?? []).length,
    livesRemaining: round.lives_remaining,
    longestStreak,
    answers: (answers ?? []).map(a => ({
      position: a.position,
      questionId: a.question_id,
      selectedOption: a.selected_option,
      correctOption: (a.question_bank as { correct_option: string })?.correct_option,
      isCorrect: a.is_correct,
      xpAwarded: a.points_awarded,
      timeTakenMs: a.time_taken_ms,
      breakdown: {
        speedBonus: a.time_bonus,
        streakBonus: a.streak_bonus,
      },
    })),
    bonusSummary: {
      totalAnswerXp,
      totalSpeedBonus,
      totalStreakBonus,
    },
  })
})
