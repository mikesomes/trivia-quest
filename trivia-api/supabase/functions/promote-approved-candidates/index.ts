import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { parseBody } from '../_shared/validation.ts'
import { CandidatePromotionError, promoteQuestionCandidate } from '../../src/questions/candidates.ts'

const MAX_BATCH_SIZE = 10

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const secret = Deno.env.get('CANDIDATE_PROMOTION_SECRET')
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return errorResponse('Unauthorized', 401)

  const body = await parseBody<{ limit?: unknown }>(req)
  if (body instanceof Response) return body
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit)
    ? Math.min(Math.max(body.limit, 1), MAX_BATCH_SIZE)
    : MAX_BATCH_SIZE

  const supabase = createServiceClient()
  const { data: candidates, error } = await supabase
    .from('question_candidates')
    .select('id')
    .eq('editorial_status', 'approved')
    .eq('verification_status', 'verified')
    .order('reviewed_at', { ascending: true })
    .limit(limit)
  if (error) return errorResponse(`Failed to load approved candidates: ${error.message}`, 500)

  const results: Array<{ candidateId: string; promoted: boolean; questionId?: string; error?: string }> = []
  for (const candidate of candidates ?? []) {
    try {
      const question = await promoteQuestionCandidate(supabase, candidate.id) as { id?: string }
      results.push({ candidateId: candidate.id, promoted: true, questionId: question?.id })
    } catch (promotionError) {
      const message = promotionError instanceof CandidatePromotionError ? promotionError.message : String(promotionError)
      results.push({ candidateId: candidate.id, promoted: false, error: message })
    }
  }

  return jsonResponse({ promoted: results.filter(result => result.promoted).length, results })
})
