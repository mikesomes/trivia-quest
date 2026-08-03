import { createClient, type Session } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars — check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// `getSession()` reads from AsyncStorage, and it sat on the critical path of
// every authenticated request — including the answer submit that gates the
// correct/wrong reveal. Keep the session in memory instead and let
// onAuthStateChange (which fires INITIAL_SESSION on subscribe, plus every
// refresh and sign-out) keep it current.
let cachedSession: Session | null = null
let inFlightSessionRead: Promise<Session | null> | null = null

/** Refresh slightly before real expiry so a request never races the boundary. */
const TOKEN_REFRESH_MARGIN_MS = 60_000

supabase.auth.onAuthStateChange((_event, session) => {
  cachedSession = session
})

/** Drop the cached session — call after a 401 so the next read goes to source. */
export function invalidateCachedSession() {
  cachedSession = null
}

export async function getCachedSession(): Promise<Session | null> {
  const expiresAtMs = cachedSession?.expires_at ? cachedSession.expires_at * 1000 : 0
  if (cachedSession && expiresAtMs - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return cachedSession
  }

  // Coalesce concurrent misses so a burst of parallel requests triggers one
  // storage read rather than one each.
  if (!inFlightSessionRead) {
    inFlightSessionRead = supabase.auth
      .getSession()
      .then(({ data }) => {
        cachedSession = data.session
        return data.session
      })
      .finally(() => {
        inFlightSessionRead = null
      })
  }

  return inFlightSessionRead
}
