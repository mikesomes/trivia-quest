import { errorResponse } from './errors.ts'

export interface AuthContext {
  userId: string
  authHeader: string
}

export async function requireAuth(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Missing or invalid authorization header', 401)
  }

  const token = authHeader.slice(7)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server configuration error', 500)
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': serviceRoleKey,
    },
  })

  if (!res.ok) {
    return errorResponse('Invalid or expired token', 401)
  }

  const user = await res.json()
  if (!user?.id) {
    return errorResponse('Invalid user', 401)
  }

  return { userId: user.id, authHeader }
}

export function isAuthError(result: AuthContext | Response): result is Response {
  return result instanceof Response
}
