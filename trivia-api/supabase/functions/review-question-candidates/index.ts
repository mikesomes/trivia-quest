import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import { AdminAuthorizationError, ReviewValidationError, assertAdminUser, validateReviewUpdate } from '../../src/questions/review.ts'

const REVIEW_LIST_FIELDS = [
  'id', 'question_text', 'category', 'subcategory', 'difficulty', 'difficulty_rating',
  'choices', 'correct_answer_index', 'correct_answer', 'explanation', 'generator_model',
  'generation_batch_id', 'blind_review_answer_index', 'blind_review_matches',
  'blind_reviewer_model', 'blind_reviewer_notes', 'blind_reviewed_at',
  'editorial_status', 'reviewer_confidence', 'reviewer_notes', 'verification_status',
  'verification_source', 'duplicate_score', 'created_at', 'reviewed_at', 'reviewed_by',
].join(',')

function requireAdmin(userId: string): Response | null {
  try {
    assertAdminUser(userId, Deno.env.get('ADMIN_USER_IDS'))
    return null
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return errorResponse(error.message, 403)
    throw error
  }
}

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (!['GET', 'PATCH'].includes(req.method)) return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth
  const forbidden = requireAdmin(auth.userId)
  if (forbidden) return forbidden

  const supabase = createServiceClient()
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('question_candidates')
      .select(REVIEW_LIST_FIELDS)
      .in('editorial_status', ['pending', 'revise'])
      .order('created_at', { ascending: true })
    if (error) return errorResponse(`Failed to list candidates: ${error.message}`, 500)
    return jsonResponse({ candidates: data ?? [] })
  }

  const body = await parseBody<{ candidateId?: unknown; review?: unknown }>(req)
  if (body instanceof Response) return body
  if (!isValidUUID(body.candidateId)) return errorResponse('Invalid candidateId', 400)

  const { data: candidate, error: candidateError } = await supabase
    .from('question_candidates')
    .select('id, correct_answer_index')
    .eq('id', body.candidateId)
    .maybeSingle()
  if (candidateError) return errorResponse(`Failed to load candidate: ${candidateError.message}`, 500)
  if (!candidate) return errorResponse('Candidate not found', 404)

  let patch
  try {
    patch = validateReviewUpdate(body.review, candidate.correct_answer_index)
  } catch (error) {
    if (error instanceof ReviewValidationError) return errorResponse(error.message, 400)
    throw error
  }

  const { data, error } = await supabase
    .from('question_candidates')
    .update({ ...patch, reviewed_at: new Date().toISOString(), reviewed_by: auth.userId })
    .eq('id', body.candidateId)
    .select(REVIEW_LIST_FIELDS)
    .single()
  if (error) return errorResponse(`Failed to update candidate review: ${error.message}`, 500)
  return jsonResponse({ candidate: data })
})
