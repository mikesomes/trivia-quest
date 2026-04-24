import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'

const FLAG_THRESHOLD = 3

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST' && req.method !== 'DELETE') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<{ questionId?: unknown }>(req)
  if (body instanceof Response) return body

  if (!isValidUUID(body.questionId)) return errorResponse('Invalid questionId', 400)

  const supabase = createServiceClient()

  if (req.method === 'DELETE') {
    // Remove this user's flag
    await supabase
      .from('question_flags')
      .delete()
      .eq('question_id', body.questionId)
      .eq('user_id', auth.userId)

    // Recount and reactivate if below threshold
    const { count } = await supabase
      .from('question_flags')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', body.questionId)

    if ((count ?? 0) < FLAG_THRESHOLD) {
      await supabase
        .from('question_bank')
        .update({ is_active: true })
        .eq('id', body.questionId)
    }

    return jsonResponse({ flagged: false, flagCount: count })
  }

  // POST: insert flag — ignore if already flagged by this user
  const { error: insertError } = await supabase
    .from('question_flags')
    .insert({ question_id: body.questionId, user_id: auth.userId })
    .select()
    .single()

  if (insertError && insertError.code !== '23505') {
    return errorResponse('Failed to record flag', 500)
  }

  // Count total flags
  const { count, error: countError } = await supabase
    .from('question_flags')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', body.questionId)

  if (countError) return errorResponse('Failed to count flags', 500)

  // Soft-delete if threshold reached
  if ((count ?? 0) >= FLAG_THRESHOLD) {
    await supabase
      .from('question_bank')
      .update({ is_active: false })
      .eq('id', body.questionId)
  }

  return jsonResponse({ flagged: true, flagCount: count })
})
