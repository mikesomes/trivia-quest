import 'react-native-gesture-handler'
import React, { useEffect } from 'react'
import { AppState, Text, TextInput } from 'react-native'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
  NunitoSans_900Black,
} from '@expo-google-fonts/nunito-sans'
import { useAuthStore } from '../src/store/authStore'
import { useMenuMusic } from '../src/hooks/useMenuMusic'
import { initSentry, Sentry, setSentryUser } from '../src/lib/sentry'
import { analytics, initAnalytics, identifyUser } from '../src/lib/analytics'
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary'
import { OfflineBanner } from '../src/components/ui/OfflineBanner'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { initNotifications, rescheduleInactivityLadder } from '../src/lib/notifications'
import { colors } from '../src/constants/theme'
import { useSyncHapticsWithReducedMotion } from '../src/hooks/useReducedMotion'
import { useSyncSoundWithStorage } from '../src/hooks/useSoundMuted'
import { initAudioSession } from '../src/lib/sound'

SplashScreen.preventAutoHideAsync()

initSentry()
initAnalytics()
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: 1,
    },
  },
})

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const userId = useAuthStore((s) => s.userId)
  useMenuMusic()
  useSyncSoundWithStorage()

  useEffect(() => {
    initAudioSession()
    initializeAuth()
  }, [])

  // Give both reporters the same identity, so a crash can be lined up with the
  // session that produced it.
  useEffect(() => {
    identifyUser(userId)
    setSentryUser(userId)
  }, [userId])

  // Each open/foreground pushes the inactivity reminders back out, so they
  // only fire after genuinely being away that long.
  useEffect(() => {
    initNotifications()
    rescheduleInactivityLadder()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') rescheduleInactivityLadder()
      // Backgrounding is where a session's tail is normally lost.
      else analytics.flush()
    })
    return () => sub.remove()
  }, [])

  if (!isInitialized) return null

  return <>{children}</>
}

// Map React Native fontWeight values to the matching Nunito variant so bold
// text renders correctly on both iOS and Android.
const NUNITO_BY_WEIGHT: Record<string, string> = {
  '100': 'NunitoSans_400Regular',
  '200': 'NunitoSans_400Regular',
  '300': 'NunitoSans_400Regular',
  '400': 'NunitoSans_400Regular',
  '500': 'NunitoSans_500Medium',
  '600': 'NunitoSans_600SemiBold',
  '700': 'NunitoSans_700Bold',
  '800': 'NunitoSans_800ExtraBold',
  '900': 'NunitoSans_900Black',
  normal: 'NunitoSans_400Regular',
  bold: 'NunitoSans_700Bold',
}

function applyNunitoDefaults() {
  // Text
  const origTextRender = (Text as any).render?.bind(Text)
  if (origTextRender) {
    ;(Text as any).render = function (props: any, ref: any) {
      const weight = String(
        (Array.isArray(props.style)
          ? props.style.findLast?.((s: any) => s?.fontWeight)?.fontWeight
          : (props.style as any)?.fontWeight) ?? '400'
      )
      const fontFamily = NUNITO_BY_WEIGHT[weight] ?? 'Nunito_400Regular'
      const style = Array.isArray(props.style)
        ? [{ fontFamily }, ...props.style]
        : [{ fontFamily }, props.style]
      return origTextRender({ ...props, style }, ref)
    }
  } else {
    // Fallback for environments where render isn't directly patchable
    ;(Text as any).defaultProps = {
      ...(Text as any).defaultProps,
      style: [{ fontFamily: 'NunitoSans_400Regular' }, (Text as any).defaultProps?.style],
    }
  }

  // TextInput
  ;(TextInput as any).defaultProps = {
    ...(TextInput as any).defaultProps,
    style: [{ fontFamily: 'NunitoSans_400Regular' }, (TextInput as any).defaultProps?.style],
  }
}

function RootLayout() {
  // Mirrors system Reduce Motion into the haptics facade for the whole app.
  useSyncHapticsWithReducedMotion()

  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
    NunitoSans_900Black,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontsLoaded) applyNunitoDefaults()
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AuthInitializer>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="game" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
            <OfflineBanner />
          </AuthInitializer>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  )

}

export default Sentry.wrap(RootLayout)
