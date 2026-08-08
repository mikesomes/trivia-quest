import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  LAST_CATEGORY: 'trivia:lastCategory',
  LAST_DIFFICULTY: 'trivia:lastDifficulty',
  ONBOARDING_DONE: 'trivia:onboardingDone',
  SOUND_ENABLED: 'trivia:soundEnabled',
} as const

export const storage = {
  async getLastCategory(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_CATEGORY)
  },
  async setLastCategory(category: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_CATEGORY, category)
  },
  async getLastDifficulty(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LAST_DIFFICULTY)
  },
  async setLastDifficulty(difficulty: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_DIFFICULTY, difficulty)
  },
  async isOnboardingDone(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE)
    return val === 'true'
  },
  async setOnboardingDone(): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true')
  },
  async isSoundEnabled(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.SOUND_ENABLED)
    return val !== 'false'
  },
  async setSoundEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.SOUND_ENABLED, enabled ? 'true' : 'false')
  },
}
