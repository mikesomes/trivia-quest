import { Stack } from 'expo-router'
import { colors } from '../../src/constants/theme'

export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {/* Forward flow: slide right */}
      <Stack.Screen name="category" options={{ animation: 'slide_from_right' }} />
      {/* Entering gameplay: fade for immersion */}
      <Stack.Screen name="play" options={{ animation: 'fade' }} />
      {/* Results rise up from below */}
      <Stack.Screen name="results" options={{ animation: 'slide_from_bottom' }} />
      {/* Game over: fade for drama */}
      <Stack.Screen name="gameover" options={{ animation: 'fade' }} />
      {/* Mode intro — shown before every game mode */}
      <Stack.Screen name="mode-intro" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="sudden-death-over" options={{ animation: 'fade' }} />
    </Stack>
  )
}
