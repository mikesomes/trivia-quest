import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'

// Called after round XP submission completes for a daily challenge round.
// Records the completion and returns the user's updated streak.
//
// POST { roundId: string }
// → { streak, xpEarned, correctCount, challengeDate }

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

  // Verify the round belongs to this user and was a daily challenge
  const { data: round } = await supabase
    .from('rounds')
    .select('id, status, is_daily_challenge, completed_at')
    .eq('id', body.roundId)
    .eq('user_id', auth.userId)
    .eq('is_daily_challenge', true)
    .maybeSingle()

  if (!round) return errorResponse('Daily challenge round not found', 404)
  if (round.status !== 'completed') return errorResponse('Round not yet completed', 400)

  // Get the submitted XP
  const { data: submission } = await supabase
    .from('scores')
    .select('xp_earned, correct_count')
    .eq('round_id', body.roundId)
    .maybeSingle()

  if (!submission) return errorResponse('XP not submitted yet', 400)

  // Determine the challenge date from when the round completed (Eastern date).
  const challengeDate = getEasternDate(round.completed_at ? new Date(round.completed_at) : undefined)

  const xpEarned = submission.xp_earned ?? 0

  // Insert completion — ignore if already recorded (idempotent)
  const { error: insertError } = await supabase
    .from('daily_challenge_completions')
    .insert({
      user_id: auth.userId,
      challenge_date: challengeDate,
      round_id: body.roundId,
      correct_count: submission.correct_count,
      xp_earned: xpEarned,
    })
    .select()

  // 23505 = unique_violation (already completed today) — treat as success
  if (insertError && insertError.code !== '23505') {
    return errorResponse('Failed to record completion', 500)
  }

  const streak = await computeStreak(supabase, auth.userId, challengeDate, true)

  return jsonResponse({
    streak,
    xpEarned,
    correctCount: submission.correct_count,
    challengeDate,
  })
})

/** Returns the date in America/New_York for a given instant (default: now). DST-safe. */
function getEasternDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

async function computeStreak(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  today: string,
  completedToday: boolean
): Promise<number> {
  const { data } = await supabase
    .from('daily_challenge_completions')
    .select('challenge_date')
    .eq('user_id', userId)
    .order('challenge_date', { ascending: false })
    .limit(365)

  const dateSet = new Set((data ?? []).map((r: { challenge_date: string }) => r.challenge_date))

  const todayDate = new Date(today + 'T00:00:00Z')

  if (completedToday) {
    let streak = 1
    const check = new Date(todayDate)
    check.setUTCDate(check.getUTCDate() - 1)
    while (dateSet.has(check.toISOString().split('T')[0])) {
      streak++
      check.setUTCDate(check.getUTCDate() - 1)
    }
    return streak
  }

  const yesterday = new Date(todayDate)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  if (!dateSet.has(yesterday.toISOString().split('T')[0])) return 0

  let streak = 1
  const check = new Date(yesterday)
  check.setUTCDate(check.getUTCDate() - 1)
  while (dateSet.has(check.toISOString().split('T')[0])) {
    streak++
    check.setUTCDate(check.getUTCDate() - 1)
  }
  return streak
}
