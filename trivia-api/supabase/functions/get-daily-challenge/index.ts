import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { GAME_CONSTANTS } from '../_shared/types.ts'

// Returns today's daily challenge status for the authenticated user.
//
// If not yet completed: creates a round using today's pre-selected questions
//   → { alreadyCompleted: false, roundId, totalQuestions, streak, challengeDate }
//
// If already completed:
//   → { alreadyCompleted: true, correctCount, xpEarned, completedAt, streak, challengeDate }

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()

  // Today's date in America/New_York (YYYY-MM-DD). Resets at midnight Eastern.
  const today = getEasternDate()

  // ── Get or create today's daily challenge ──────────────────────────────────
  let challengeRow = await getDailyChallenge(supabase, today)

  if (!challengeRow) {
    challengeRow = await createDailyChallenge(supabase, today)
    if (!challengeRow) return errorResponse('Failed to create daily challenge', 500)
  }

  // ── Check if user already completed today ─────────────────────────────────
  const { data: completion } = await supabase
    .from('daily_challenge_completions')
    .select('correct_count, xp_earned, completed_at')
    .eq('user_id', auth.userId)
    .eq('challenge_date', today)
    .maybeSingle()

  const streak = await computeStreak(supabase, auth.userId, today, !!completion)

  if (completion) {
    return jsonResponse({
      alreadyCompleted: true,
      correctCount: completion.correct_count,
      xpEarned: completion.xp_earned,
      completedAt: completion.completed_at,
      streak,
      challengeDate: today,
    })
  }

  // ── Create a round using today's pre-selected questions ───────────────────

  // Abandon any existing active round for this user
  const { data: existingRound } = await supabase
    .from('rounds')
    .select('id')
    .eq('user_id', auth.userId)
    .eq('status', 'active')
    .maybeSingle()

  if (existingRound) {
    await supabase.from('rounds').update({ status: 'abandoned' }).eq('id', existingRound.id)
  }

  // Fetch the actual question rows (to validate they're still active)
  const { data: questions, error: qError } = await supabase
    .from('question_bank')
    .select('id, category, difficulty, question_text, option_a, option_b, option_c, option_d, correct_option, explanation')
    .in('id', challengeRow.question_ids)
    .eq('is_active', true)

  if (qError || !questions || questions.length < GAME_CONSTANTS.QUESTIONS_PER_ROUND) {
    // Regenerate today's challenge if questions have become inactive
    const fresh = await createDailyChallenge(supabase, today, true)
    if (!fresh) return errorResponse('Insufficient active questions for daily challenge', 503)
    return errorResponse('Daily challenge refreshed — please retry', 503)
  }

  // Sort by original position in challengeRow.question_ids
  const idOrder = new Map(challengeRow.question_ids.map((id: string, i: number) => [id, i]))
  questions.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

  // Create the round. The set is mixed, so round metadata records the majority
  // category/difficulty of today's actual questions.
  const expiresAt = new Date(Date.now() + GAME_CONSTANTS.ROUND_EXPIRY_MINUTES * 60 * 1000).toISOString()
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .insert({
      user_id: auth.userId,
      category: majorityValue(questions.map(q => q.category)),
      difficulty: majorityValue(questions.map(q => q.difficulty)),
      status: 'active',
      lives_remaining: GAME_CONSTANTS.STARTING_LIVES,
      hammers: GAME_CONSTANTS.STARTING_HAMMERS,
      shields: GAME_CONSTANTS.STARTING_SHIELDS,
      streak: 0,
      is_daily_challenge: true,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (roundError || !round) return errorResponse('Failed to create round', 500)

  // Insert round_questions
  const { error: rqError } = await supabase.from('round_questions').insert(
    questions.map((q, index) => ({ round_id: round.id, question_id: q.id, position: index }))
  )

  if (rqError) {
    await supabase.from('rounds').delete().eq('id', round.id)
    return errorResponse('Failed to assign questions', 500)
  }

  // Mark questions as used
  await supabase.rpc('increment_times_used', { question_ids: questions.map(q => q.id) })

  return jsonResponse({
    alreadyCompleted: false,
    roundId: round.id,
    totalQuestions: questions.length,
    streak,
    challengeDate: today,
  })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the current date in America/New_York (YYYY-MM-DD). DST-safe via IANA tz. */
function getEasternDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

/** Most frequent value in a list (first-seen wins ties). */
function majorityValue(values: string[]): string {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best = values[0]
  let bestCount = 0
  for (const [v, count] of counts) {
    if (count > bestCount) {
      best = v
      bestCount = count
    }
  }
  return best
}

async function getDailyChallenge(supabase: ReturnType<typeof createServiceClient>, date: string) {
  const { data } = await supabase
    .from('daily_challenges')
    .select('id, challenge_date, question_ids')
    .eq('challenge_date', date)
    .maybeSingle()
  return data
}

async function createDailyChallenge(
  supabase: ReturnType<typeof createServiceClient>,
  date: string,
  forceUpdate = false
) {
  // Pick 10 random active questions with a rough difficulty spread: 3 easy, 4 medium, 3 hard
  const picks: string[] = []

  for (const [difficulty, count] of [['easy', 3], ['medium', 4], ['hard', 3]] as const) {
    const { data } = await supabase
      .from('question_bank')
      .select('id')
      .eq('is_active', true)
      .eq('difficulty', difficulty)
      .limit(count * 10) // over-fetch, then sample randomly

    if (data && data.length > 0) {
      const shuffled = data.sort(() => Math.random() - 0.5).slice(0, count)
      picks.push(...shuffled.map(q => q.id))
    }
  }

  if (picks.length < GAME_CONSTANTS.QUESTIONS_PER_ROUND) return null

  const question_ids = picks.slice(0, GAME_CONSTANTS.QUESTIONS_PER_ROUND)

  if (forceUpdate) {
    const { data } = await supabase
      .from('daily_challenges')
      .update({ question_ids })
      .eq('challenge_date', date)
      .select()
      .single()
    return data
  }

  const { data } = await supabase
    .from('daily_challenges')
    .upsert({ challenge_date: date, question_ids }, { onConflict: 'challenge_date', ignoreDuplicates: true })
    .select()
    .single()

  // If upsert returned nothing (duplicate was ignored), fetch the existing row
  return data ?? await getDailyChallenge(supabase, date)
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
    // Count today plus consecutive days before
    let streak = 1
    const check = new Date(todayDate)
    check.setUTCDate(check.getUTCDate() - 1)
    while (dateSet.has(check.toISOString().split('T')[0])) {
      streak++
      check.setUTCDate(check.getUTCDate() - 1)
    }
    return streak
  }

  // Not completed today — check if yesterday keeps a streak alive
  const yesterday = new Date(todayDate)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (!dateSet.has(yesterdayStr)) return 0

  let streak = 1
  const check = new Date(yesterday)
  check.setUTCDate(check.getUTCDate() - 1)
  while (dateSet.has(check.toISOString().split('T')[0])) {
    streak++
    check.setUTCDate(check.getUTCDate() - 1)
  }
  return streak
}
