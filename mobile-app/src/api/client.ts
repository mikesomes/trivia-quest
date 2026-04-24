import { supabase } from '../lib/supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

function getFunctionName(path: string) {
  return path.replace(/^\/+/, '')
}

async function parseFunctionInvokeError(error: any) {
  const response = error?.context
  if (!response || typeof response !== 'object' || typeof response.clone !== 'function') {
    return { message: error?.message ?? 'Function invocation failed', status: 500, details: undefined }
  }

  const status = typeof response.status === 'number' ? response.status : 500
  const details = await response.clone().json().catch(async () => {
    const text = await response.clone().text().catch(() => '')
    return text ? { error: text } : undefined
  })

  const message =
    details?.error ??
    details?.message ??
    error?.message ??
    `HTTP ${status}`

  return { message, status, details }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  }
}

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const headers = await getAuthHeaders()
  const res = await fetch(url.toString(), { method: 'GET', headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    console.error(`[api] GET ${res.status} from ${path}:`, JSON.stringify(body))
    throw new ApiError(body.error ?? body.message ?? `HTTP ${res.status}`, res.status, body)
  }

  return res.json()
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }))
    console.error(`[api] POST ${res.status} from ${path}:`, JSON.stringify(errBody))

    if (res.status === 404 && errBody?.code === 'NOT_FOUND') {
      const functionName = getFunctionName(path)
      console.warn(`[api] falling back to supabase.functions.invoke("${functionName}")`)

      const { data, error } = await supabase.functions.invoke<T>(functionName, { body: body as any })

      if (!error) return data as T

      const parsedError = await parseFunctionInvokeError(error)
      console.error(
        `[api] invoke fallback failed for ${functionName} (${parsedError.status}):`,
        JSON.stringify(parsedError.details ?? { message: parsedError.message })
      )
      throw new ApiError(parsedError.message, parsedError.status, parsedError.details)
    }

    throw new ApiError(errBody.error ?? errBody.message ?? `HTTP ${res.status}`, res.status, errBody)
  }

  return res.json()
}

/** For public endpoints that don't require user auth — uses anon key only. */
export async function apiGetPublic<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(body.error ?? body.message ?? `HTTP ${res.status}`, res.status, body)
  }

  return res.json()
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError ||
    (error instanceof Error &&
      error.name === 'ApiError' &&
      typeof (error as { status?: unknown }).status === 'number')
  )
}

export function isAlreadyAnsweredError(error: unknown): boolean {
  return (
    isApiError(error) &&
    error.status === 400 &&
    error.message === 'This question has already been answered'
  )
}
