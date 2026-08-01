import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { jsonResponse, errorResponse } from '../_shared/errors.ts'

// Returns total active question count per category.
// No auth required — question counts are public info.
Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  const supabase = createServiceClient()

  // PostgREST caps an unpaginated select at 1,000 rows, and the bank is well
  // past that — so this walked pages instead of trusting a single response,
  // which was silently dropping every category the 1,000-row cap fell short of.
  const PAGE_SIZE = 1000
  const counts: Record<string, number> = {}
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('question_bank')
      .select('category')
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1)

    if (error) return errorResponse('Failed to fetch counts', 500)
    if (!data || data.length === 0) break

    for (const row of data) {
      counts[row.category] = (counts[row.category] ?? 0) + 1
    }

    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return jsonResponse(counts)
})
