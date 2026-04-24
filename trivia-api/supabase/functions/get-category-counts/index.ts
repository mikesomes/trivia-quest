import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { jsonResponse, errorResponse } from '../_shared/errors.ts'

// Returns total active question count per category.
// No auth required — question counts are public info.
Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('question_bank')
    .select('category')
    .eq('is_active', true)

  if (error) return errorResponse('Failed to fetch counts', 500)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.category] = (counts[row.category] ?? 0) + 1
  }

  return jsonResponse(counts)
})
