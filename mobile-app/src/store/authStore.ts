import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const REFRESH_TOKEN_KEY = 'trivia_refresh_token'

async function saveRefreshToken(token: string) {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
  } catch {}
}

async function loadRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

async function clearRefreshToken() {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
  } catch {}
}

interface AuthState {
  userId: string | null
  displayName: string | null
  isAnonymous: boolean
  session: Session | null
  isInitialized: boolean

  initializeAuth: () => Promise<void>
  setSession: (session: Session | null) => void
  setDisplayName: (name: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      displayName: null,
      isAnonymous: true,
      session: null,
      isInitialized: false,

      initializeAuth: async () => {
        // 1. Try existing session validated server-side
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (user && !userError) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.refresh_token) saveRefreshToken(session.refresh_token)
          set({ userId: user.id, session, isInitialized: true })
        } else {
          // 2. No valid session — check Keychain for a stored refresh token
          //    (survives reinstall on iOS)
          const storedToken = await loadRefreshToken()
          if (storedToken) {
            const { data, error } = await supabase.auth.refreshSession({ refresh_token: storedToken })
            if (!error && data.session) {
              saveRefreshToken(data.session.refresh_token)
              set({
                userId: data.session.user.id,
                session: data.session,
                isAnonymous: data.session.user.app_metadata?.provider === 'anonymous',
                isInitialized: true,
              })
              supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.refresh_token) saveRefreshToken(session.refresh_token)
                set({
                  userId: session?.user?.id ?? null,
                  session,
                  isAnonymous: session?.user?.app_metadata?.provider === 'anonymous',
                })
              })
              return
            }
            // Stored token expired — fall through to new anonymous sign-in
            await clearRefreshToken()
          }

          // 3. Fresh install with no recoverable session — create anonymous account
          await supabase.auth.signOut()
          const { data, error } = await supabase.auth.signInAnonymously()
          if (error || !data.session) {
            console.error('Anonymous auth failed:', error)
            set({ isInitialized: true })
            return
          }
          saveRefreshToken(data.session.refresh_token)
          set({
            userId: data.session.user.id,
            session: data.session,
            isAnonymous: true,
            isInitialized: true,
          })
        }

        // Keep Keychain in sync whenever Supabase silently refreshes the token
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.refresh_token) saveRefreshToken(session.refresh_token)
          set({
            userId: session?.user?.id ?? null,
            session,
            isAnonymous: session?.user?.app_metadata?.provider === 'anonymous',
          })
        })
      },

      setSession: (session) => {
        if (session?.refresh_token) saveRefreshToken(session.refresh_token)
        set({
          session,
          userId: session?.user?.id ?? null,
          isAnonymous: session?.user?.app_metadata?.provider === 'anonymous',
        })
      },

      setDisplayName: (name) => set({ displayName: name }),

      clearAuth: async () => {
        await clearRefreshToken()
        set({ userId: null, displayName: null, isAnonymous: true, session: null })
      },
    }),
    {
      name: 'trivia-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        displayName: state.displayName,
      }),
    }
  )
)
