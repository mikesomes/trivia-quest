// The session cache sits on the critical path of every authenticated request —
// including the answer submit that gates the correct/wrong reveal. A stale token
// here would 401 mid-round, so the expiry handling is worth pinning down.

const NOW_SECONDS = Math.floor(Date.now() / 1000)

function loadSessionModule(getSession: jest.Mock) {
  let authStateHandler: ((event: string, session: unknown) => void) | undefined

  jest.isolateModules(() => {
    jest.doMock('@react-native-async-storage/async-storage', () => ({ default: {} }))
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        auth: {
          getSession,
          onAuthStateChange: (handler: (event: string, session: unknown) => void) => {
            authStateHandler = handler
            return { data: { subscription: { unsubscribe: jest.fn() } } }
          },
        },
      }),
    }))
  })

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../../src/lib/supabase')
  return { ...mod, fireAuthStateChange: (session: unknown) => authStateHandler?.('TOKEN_REFRESHED', session) }
}

function session(expiresInSeconds: number) {
  return { access_token: 'token', expires_at: NOW_SECONDS + expiresInSeconds }
}

beforeEach(() => {
  jest.resetModules()
})

describe('getCachedSession', () => {
  it('reads storage once for repeated calls while the token is fresh', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: session(3600) } })
    const { getCachedSession } = loadSessionModule(getSession)

    await getCachedSession()
    await getCachedSession()
    await getCachedSession()

    expect(getSession).toHaveBeenCalledTimes(1)
  })

  it('coalesces concurrent misses into a single storage read', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: session(3600) } })
    const { getCachedSession } = loadSessionModule(getSession)

    await Promise.all([getCachedSession(), getCachedSession(), getCachedSession()])

    expect(getSession).toHaveBeenCalledTimes(1)
  })

  it('re-reads when the cached token is inside the refresh margin', async () => {
    // 30s of life left, inside the 60s margin — must not be served from cache.
    const getSession = jest.fn().mockResolvedValue({ data: { session: session(30) } })
    const { getCachedSession } = loadSessionModule(getSession)

    await getCachedSession()
    await getCachedSession()

    expect(getSession).toHaveBeenCalledTimes(2)
  })

  it('re-reads after the cache is invalidated', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: session(3600) } })
    const { getCachedSession, invalidateCachedSession } = loadSessionModule(getSession)

    await getCachedSession()
    invalidateCachedSession()
    await getCachedSession()

    expect(getSession).toHaveBeenCalledTimes(2)
  })

  it('takes a refreshed session from onAuthStateChange without hitting storage', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: session(3600) } })
    const { getCachedSession, fireAuthStateChange } = loadSessionModule(getSession)

    fireAuthStateChange(session(3600))
    await getCachedSession()

    expect(getSession).not.toHaveBeenCalled()
  })

  it('returns null when there is no session at all', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: null } })
    const { getCachedSession } = loadSessionModule(getSession)

    await expect(getCachedSession()).resolves.toBeNull()
  })
})
