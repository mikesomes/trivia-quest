import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  LAST_CATEGORY: 'trivia:lastCategory',
  LAST_DIFFICULTY: 'trivia:lastDifficulty',
  ONBOARDING_DONE: 'trivia:onboardingDone',
  QUEST_ONBOARDING_DONE: 'trivia:questOnboardingDone',
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
  async isQuestOnboardingDone(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.QUEST_ONBOARDING_DONE)
    return val === 'true'
  },
  async setQuestOnboardingDone(): Promise<void> {
    await AsyncStorage.setItem(KEYS.QUEST_ONBOARDING_DONE, 'true')
  },
}
