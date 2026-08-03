jest.mock('../../src/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
  getCachedSession: jest.fn(),
  invalidateCachedSession: jest.fn(),
}))

process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test'

// require rather than import so the base-URL env var above is set before the
// module reads it at load time.
const { apiGet, apiPost } = require('../../src/api/client')
const { getCachedSession, invalidateCachedSession } = require('../../src/lib/supabase')

const REQUEST_TIMEOUT_MS = 8000

function okResponse(body: unknown = { ok: true }) {
  return { ok: true, status: 200, json: async () => body }
}

function errorResponse(status: number, body: unknown = { error: 'nope' }) {
  return { ok: false, status, statusText: 'Error', json: async () => body }
}

/** A fetch that never settles until its abort signal fires. */
function hangingFetch() {
  return jest.fn(
    (_url: string, init: any) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const err = new Error('Aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  getCachedSession.mockResolvedValue({ access_token: 'token-1', expires_at: 9_999_999_999 })
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

describe('request timeout', () => {
  it('aborts a request that outlives the timeout and reports it as a timeout', async () => {
    jest.useFakeTimers()
    global.fetch = hangingFetch() as any

    const assertion = expect(apiPost('/submit-answer', {})).rejects.toMatchObject({
      name: 'NetworkError',
      isTimeout: true,
    })

    // The async variant yields to the microtask queue first, so the awaited
    // session read completes and registers the timeout before we advance past it.
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await assertion
  })

  it('does not abort a request that answers in time', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse({ id: 1 })) as any
    await expect(apiPost('/finish-round', {})).resolves.toEqual({ id: 1 })
  })
})

describe('retry policy', () => {
  it('retries a GET once when the transport fails', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(okResponse({ id: 2 }))
    global.fetch = fetchMock as any

    await expect(apiGet('/get-profile')).resolves.toEqual({ id: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives up on a GET after one retry', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('Network request failed'))
    global.fetch = fetchMock as any

    await expect(apiGet('/get-profile')).rejects.toMatchObject({ name: 'NetworkError' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('never retries a server response, only a transport failure', async () => {
    const fetchMock = jest.fn().mockResolvedValue(errorResponse(400))
    global.fetch = fetchMock as any

    await expect(apiGet('/get-profile')).rejects.toMatchObject({ name: 'ApiError', status: 400 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never retries /submit-answer — it is not idempotent', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('Network request failed'))
    global.fetch = fetchMock as any

    await expect(apiPost('/submit-answer', {})).rejects.toMatchObject({ name: 'NetworkError' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('auth', () => {
  it('reads the session through the cache, once per request', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse()) as any

    await apiPost('/finish-round', {})
    await apiPost('/finish-round', {})

    expect(getCachedSession).toHaveBeenCalledTimes(2)
  })

  it('drops the cached session and retries once on a 401', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(okResponse({ id: 3 }))
    global.fetch = fetchMock as any

    await expect(apiPost('/finish-round', {})).resolves.toEqual({ id: 3 })
    expect(invalidateCachedSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('surfaces a 401 that survives the refresh', async () => {
    global.fetch = jest.fn().mockResolvedValue(errorResponse(401, {})) as any

    await expect(apiPost('/finish-round', {})).rejects.toMatchObject({ name: 'ApiError', status: 401 })
  })

  it('refuses to send a request with no session', async () => {
    getCachedSession.mockResolvedValue(null)
    global.fetch = jest.fn() as any

    await expect(apiPost('/finish-round', {})).rejects.toThrow('Not authenticated')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
