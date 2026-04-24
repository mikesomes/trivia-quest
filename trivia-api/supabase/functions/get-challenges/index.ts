import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { CHALLENGE_DEFS, getPeriodStart } from '../_shared/challenges.ts'

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()

  // Fetch all progress rows for current periods
  const periodStarts = [...new Set(CHALLENGE_DEFS.map(c => getPeriodStart(c.period)))]
  const { data: progressRows } = await supabase
    .from('user_challenge_progress')
    .select('challenge_id, progress, is_complete, xp_awarded, period_start')
    .eq('user_id', auth.userId)
    .in('period_start', periodStarts)

  const progressMap = new Map(
    (progressRows ?? []).map(r => [`${r.challenge_id}:${r.period_start}`, r])
  )

  const challenges = CHALLENGE_DEFS.map(def => {
    const periodStart = getPeriodStart(def.period)
    const row = progressMap.get(`${def.id}:${periodStart}`)
    return {
      id: def.id,
      period: def.period,
      label: def.label,
      emoji: def.emoji,
      target: def.target,
      xpReward: def.xpReward,
      progress: row?.progress ?? 0,
      isComplete: row?.is_complete ?? false,
      periodStart,
    }
  })

  return jsonResponse({ challenges })
})
