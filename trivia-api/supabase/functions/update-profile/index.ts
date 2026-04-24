import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { parseBody } from '../_shared/validation.ts'

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<{ displayName?: unknown }>(req)
  if (body instanceof Response) return body

  if (typeof body.displayName !== 'string') return errorResponse('displayName is required', 400)

  const name = body.displayName.trim()
  if (name.length < 1 || name.length > 20) return errorResponse('Name must be 1–20 characters', 400)
  if (!/^[a-zA-Z0-9 _\-!.]+$/.test(name)) return errorResponse('Name contains invalid characters', 400)

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('users')
    .update({ display_name: name })
    .eq('id', auth.userId)

  if (error) return errorResponse('Failed to update profile', 500)

  return jsonResponse({ displayName: name })
})
