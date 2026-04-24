import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../src/store/authStore'
import { colors } from '../src/constants/theme'
import { storage } from '../src/utils/storage'
import { profileApi } from '../src/api/profile'

// Pattern of the auto-generated name assigned by the DB trigger
const AUTO_NAME_RE = /^Player_[A-Z0-9]{6}$/i

type Destination = '/(tabs)/home' | '/onboarding'

export default function Index() {
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const userId = useAuthStore((s) => s.userId)
  const [destination, setDestination] = useState<Destination | null>(null)

  useEffect(() => {
    if (!isInitialized || !userId) return
    let isActive = true

    const setResolvedDestination = (next: Destination) => {
      if (isActive) setDestination(next)
    }

    async function resolve() {
      // Fast path: onboarding already completed on this device
      const done = await storage.isOnboardingDone()
      if (done) {
        setResolvedDestination('/(tabs)/home')
        return
      }

      // Slow path: onboarding flag missing (fresh install or reinstall).
      // Fetch profile to check if the user already set a name in a previous
      // install — if so, skip onboarding and set the flag for next time.
      try {
        const profile = await profileApi.get()
        if (AUTO_NAME_RE.test(profile.displayName)) {
          setResolvedDestination('/onboarding')
        } else {
          await storage.setOnboardingDone()
          setResolvedDestination('/(tabs)/home')
        }
      } catch {
        // Can't reach the server — send to onboarding where they can retry
        setResolvedDestination('/onboarding')
      }
    }

    resolve()

    return () => {
      isActive = false
    }
  }, [isInitialized, userId])

  if (!isInitialized || !destination) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return <Redirect href={destination} />
}
