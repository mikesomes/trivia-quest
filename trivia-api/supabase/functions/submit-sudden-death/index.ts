import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import { levelFromXp, xpToNextLevel } from '../_shared/scoring.ts'

// Maximum number of SD batches we'll accept.
// Each batch is 10 questions → 200 batches = 2000 questions max per run.
// Adjust upward if legitimate players ever reach this (highly unlikely).
const MAX_SD_ROUNDS = 200

// POST { roundIds: string[] }
// → { submissionId, runXp, questionsAnswered, xpEarned, newXp, newLevel, leveledUp, rank, xpToNextLevel }
//
// All submitted values (run XP, questionsAnswered) are derived exclusively from
// DB records. The client cannot inflate either field.

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<{ roundIds?: unknown }>(req)
  if (body instanceof Response) return body

  // ── Validate roundIds ─────────────────────────────────────────────────────
  if (!Array.isArray(body.roundIds) || body.roundIds.length === 0) {
    return errorResponse('roundIds must be a non-empty array', 400)
  }
  if (body.roundIds.length > MAX_SD_ROUNDS) {
    return errorResponse(`Too many rounds (max ${MAX_SD_ROUNDS})`, 400)
  }
  if (!body.roundIds.every((id) => isValidUUID(id))) {
    return errorResponse('All round IDs must be valid UUIDs', 400)
  }

  // Deduplicate to prevent the same round ID being counted twice
  const roundIds = [...new Set(body.roundIds as string[])]

  const supabase = createServiceClient()

  // ── Verify rounds ─────────────────────────────────────────────────────────
  // All rounds must exist, belong to this user, be completed, and not already
  // claimed by a previous sudden death submission.
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id, xp_earned_in_round, sd_submitted')
    .in('id', roundIds)
    .eq('user_id', auth.userId)
    .eq('status', 'completed')

  if (roundsError) return errorResponse('Failed to fetch rounds', 500)

  if (!rounds || rounds.length !== roundIds.length) {
    return errorResponse(
      'One or more rounds are invalid, not completed, or do not belong to this account',
      400
    )
  }

  const alreadyUsed = rounds.find((r) => r.sd_submitted)
  if (alreadyUsed) {
    return errorResponse('One or more rounds have already been used in a survival run', 409)
  }

  // ── Server-side totals ────────────────────────────────────────────────────
  const runXp = rounds.reduce((sum, r) => sum + (r.xp_earned_in_round ?? 0), 0)

  const { count: correctCount, error: countError } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .in('round_id', roundIds)
    .eq('is_correct', true)

  if (countError) return errorResponse('Failed to count answers', 500)

  const questionsAnswered = correctCount ?? 0

  // ── Mark rounds as used (prevent replay) ─────────────────────────────────
  const { data: claimedRounds, error: markError } = await supabase
    .from('rounds')
    .update({ sd_submitted: true })
    .eq('user_id', auth.userId)
    .eq('status', 'completed')
    .eq('sd_submitted', false)
    .in('id', roundIds)
    .select('id')

  if (markError) return errorResponse('Failed to finalise run', 500)
  if ((claimedRounds ?? []).length !== roundIds.length) {
    return errorResponse('One or more rounds have already been used in a survival run', 409)
  }

  // ── Insert run record ─────────────────────────────────────────────────────
  const { data: submission, error: submissionError } = await supabase
    .from('sudden_death_scores')
    .insert({
      user_id: auth.userId,
      questions_answered: questionsAnswered,
      total_score: runXp,
      xp_earned: runXp,
    })
    .select()
    .single()

  if (submissionError || !submission) return errorResponse('Failed to save run XP', 500)

  // ── XP award ─────────────────────────────────────────────────────────────
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('xp, level')
    .eq('id', auth.userId)
    .single()

  if (userError || !user) return errorResponse('Failed to fetch user', 500)

  const xpEarned = runXp
  const newXp = user.xp + xpEarned
  const oldLevel = levelFromXp(user.xp)
  const newLevel = levelFromXp(newXp)
  const leveledUp = newLevel > oldLevel

  await supabase.from('users').update({ xp: newXp, level: newLevel }).eq('id', auth.userId)

  // ── Rank ──────────────────────────────────────────────────────────────────
  // Rank purely by XP earned in the run.
  const { count: betterRuns } = await supabase
    .from('sudden_death_scores')
    .select('*', { count: 'exact', head: true })
    .gt('xp_earned', runXp)

  const rank = (betterRuns ?? 0) + 1

  return jsonResponse({
    submissionId: submission.id,
    runXp,
    questionsAnswered,
    xpEarned,
    newXp,
    newLevel,
    leveledUp,
    rank,
    xpToNextLevel: xpToNextLevel(newXp),
  })
})
