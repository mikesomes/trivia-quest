import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import { CandidatePromotionError, promoteQuestionCandidate } from '../../src/questions/candidates.ts'

const MAX_BATCH_SIZE = 10

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const secret = Deno.env.get('CANDIDATE_PROMOTION_SECRET')
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return errorResponse('Unauthorized', 401)

  const body = await parseBody<{ limit?: unknown; generationBatchId?: unknown }>(req)
  if (body instanceof Response) return body
  if (body.generationBatchId !== undefined && !isValidUUID(body.generationBatchId)) {
    return errorResponse('generationBatchId must be a UUID', 400)
  }
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit)
    ? Math.min(Math.max(body.limit, 1), MAX_BATCH_SIZE)
    : MAX_BATCH_SIZE

  const supabase = createServiceClient()
  let query = supabase
    .from('question_candidates')
    .select('id')
    .eq('editorial_status', 'approved')
    .eq('verification_status', 'verified')
    .eq('blind_review_matches', true)
    .not('blind_reviewed_at', 'is', null)
    .order('reviewed_at', { ascending: true })
    .limit(limit)
  if (body.generationBatchId) query = query.eq('generation_batch_id', body.generationBatchId)
  const { data: candidates, error } = await query
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
