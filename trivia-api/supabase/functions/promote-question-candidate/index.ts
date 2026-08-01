import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import { AdminAuthorizationError, assertAdminUser } from '../../src/questions/review.ts'
import { CandidatePromotionError, promoteQuestionCandidate } from '../../src/questions/candidates.ts'

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth
  try {
    assertAdminUser(auth.userId, Deno.env.get('ADMIN_USER_IDS'))
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return errorResponse(error.message, 403)
    throw error
  }

  const body = await parseBody<{ candidateId?: unknown }>(req)
  if (body instanceof Response) return body
  if (!isValidUUID(body.candidateId)) return errorResponse('Invalid candidateId', 400)

  try {
    const question = await promoteQuestionCandidate(createServiceClient(), body.candidateId)
    return jsonResponse({ promoted: true, question })
  } catch (error) {
    if (error instanceof CandidatePromotionError) return errorResponse(error.message, 409)
    return errorResponse(`Failed to promote candidate: ${String(error)}`, 500)
  }
})
