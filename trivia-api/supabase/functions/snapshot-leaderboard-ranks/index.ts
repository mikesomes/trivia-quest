import { handleCors } from '../_shared/cors.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { makeLogger, getRequestId } from '../_shared/logger.ts'

// Snapshots current leaderboard ranks so get-leaderboard can compute
// "since last snapshot" movement badges. Intended to run once daily via an
// external cron service (see README) — not exposed to players.
//
// POST {} with Authorization: Bearer <CRON_SECRET> (or the service role key,
// for manual triggering — same convention as generate-questions).
//
// Survival is deliberately excluded: its ranking is computed in-memory from
// deduped sudden_death_scores rows rather than a simple ranked view, so it
// isn't a one-line snapshot; it can be added later if worth the complexity.
const SNAPSHOT_SOURCES: Array<{ mode: string; period: string; view: string }> = [
  { mode: 'xp',      period: 'alltime', view: 'leaderboard_global' },
  { mode: 'xp',      period: 'weekly',  view: 'xp_leaderboard_weekly' },
  { mode: 'classic', period: 'alltime', view: 'classic_leaderboard_alltime' },
  { mode: 'classic', period: 'weekly',  view: 'classic_leaderboard_weekly' },
  { mode: 'blitz',   period: 'alltime', view: 'blitz_leaderboard_alltime' },
  { mode: 'blitz',   period: 'weekly',  view: 'blitz_leaderboard_weekly' },
]

Deno.serve(async (req) => {
  const requestId = getRequestId(req)
  const log = makeLogger('snapshot-leaderboard-ranks', requestId)

  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const cronSecret = Deno.env.get('CRON_SECRET')
  const authHeader = req.headers.get('Authorization')
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const isServiceCall = serviceKey && authHeader === `Bearer ${serviceKey}`

  if (!isCronCall && !isServiceCall) {
    return errorResponse('Unauthorized', 401)
  }

  const supabase = createServiceClient()
  const snapshottedAt = new Date().toISOString()
  const results: Record<string, number> = {}

  for (const source of SNAPSHOT_SOURCES) {
    const { data, error } = await supabase.from(source.view).select('user_id, rank')

    if (error) {
      log.error('Failed to read source view', { view: source.view, error: error.message })
      return errorResponse(`Failed to read ${source.view}: ${error.message}`, 500)
    }
    if (!data || data.length === 0) {
      results[`${source.mode}:${source.period}`] = 0
      continue
    }

    const rows = data.map((row: { user_id: string; rank: number }) => ({
      mode: source.mode,
      period: source.period,
      user_id: row.user_id,
      rank: row.rank,
      snapshotted_at: snapshottedAt,
    }))

    const { error: upsertError } = await supabase
      .from('leaderboard_rank_snapshots')
      .upsert(rows, { onConflict: 'mode,period,user_id' })

    if (upsertError) {
      log.error('Failed to upsert snapshot rows', { mode: source.mode, period: source.period, error: upsertError.message })
      return errorResponse(`Failed to snapshot ${source.mode}/${source.period}: ${upsertError.message}`, 500)
    }

    results[`${source.mode}:${source.period}`] = rows.length
  }

  log.info('Leaderboard ranks snapshotted', results)
  return jsonResponse({ success: true, snapshottedAt, results })
})
