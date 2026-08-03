import { supabase, getCachedSession, invalidateCachedSession } from '../lib/supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** No request may outlive this. Without it a dropped response hangs forever —
 * on the gameplay screen that meant a highlighted answer and no way out. */
const REQUEST_TIMEOUT_MS = 8000

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
  const session = await getCachedSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  }
}

/** A request that never reached a server response: timed out, or the transport
 * failed. Distinct from ApiError, which means the server answered with a code. */
export class NetworkError extends Error {
  constructor(message: string, public readonly isTimeout: boolean) {
    super(message)
    this.name = 'NetworkError'
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return (
    error instanceof NetworkError ||
    (error instanceof Error &&
      error.name === 'NetworkError' &&
      typeof (error as { isTimeout?: unknown }).isTimeout === 'boolean')
  )
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (controller.signal.aborted) {
      throw new NetworkError('The request timed out. Check your connection.', true)
    }
    throw new NetworkError((err as Error)?.message ?? 'Network request failed', false)
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch with auth, retrying exactly once on a 401 with a freshly read session —
 * the in-memory cache can hold a token the server has already rotated. */
async function authedFetch(url: string, init: RequestInit): Promise<Response> {
  const res = await fetchWithTimeout(url, { ...init, headers: await getAuthHeaders() })
  if (res.status !== 401) return res

  invalidateCachedSession()
  return fetchWithTimeout(url, { ...init, headers: await getAuthHeaders() })
}

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  // GETs are idempotent, so a transport failure is safe to retry. Server
  // responses (4xx/5xx) are not retried — they are answers, not failures.
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await authedFetch(url.toString(), { method: 'GET' })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        console.error(`[api] GET ${res.status} from ${path}:`, JSON.stringify(body))
        throw new ApiError(body.error ?? body.message ?? `HTTP ${res.status}`, res.status, body)
      }

      return res.json()
    } catch (err) {
      if (attempt >= 1 || !isNetworkError(err)) throw err
    }
  }
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  // Deliberately not retried. None of these endpoints are idempotent —
  // /submit-answer inserts an answer row and a duplicate returns 400
  // "already been answered", with no way to read back the recorded result. A
  // silent retry would turn a lost response into a wrong-looking answer.
  const res = await authedFetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }))
    console.error(`[api] POST ${res.status} from ${path}:`, JSON.stringify(errBody))

    if (res.status === 404 && errBody?.code === 'NOT_FOUND') {
      const functionName = getFunctionName(path)
      console.warn(`[api] falling back to supabase.functions.invoke("${functionName}")`)

      // invoke() runs its own fetch and takes no abort signal, so bound it here
      // too — otherwise this fallback reintroduces the unbounded hang.
      const { data, error } = await Promise.race([
        supabase.functions.invoke<T>(functionName, { body: body as any }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new NetworkError('The request timed out. Check your connection.', true)),
            REQUEST_TIMEOUT_MS
          )
        ),
      ])

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

  const res = await fetchWithTimeout(url.toString(), {
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
