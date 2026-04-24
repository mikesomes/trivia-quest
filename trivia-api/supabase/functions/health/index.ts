import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { jsonResponse, errorResponse } from '../_shared/errors.ts'

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

  const start = Date.now()

  try {
    const supabase = createServiceClient()
    // Lightweight connectivity check — just verify the DB responds
    const { error } = await supabase.from('users').select('id').limit(1)
    if (error) throw error

    return jsonResponse({
      status: 'ok',
      db: 'connected',
      latencyMs: Date.now() - start,
    })
  } catch (err) {
    return jsonResponse(
      {
        status: 'degraded',
        db: 'error',
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
      },
      503
    )
  }
})
