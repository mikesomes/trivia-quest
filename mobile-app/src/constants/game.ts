export const GAME_CONFIG = {
  QUESTIONS_PER_ROUND: 10,
  TIMER_SECONDS: 15,
  BLITZ_SECONDS: 45,
  BLITZ_QUESTIONS: 30,
  BLITZ_TIME_BONUS_MS: 5000,
  BLITZ_WRONG_PENALTY_MS: 5000,
  BLITZ_STREAK_THRESHOLD: 3,
  STARTING_LIVES: 3,
  STARTING_HAMMERS: 1,
  STARTING_SHIELDS: 0,
  MAX_LIVES: 7,
  MAX_HAMMERS: 5,
  MOMENTUM_WINDOW_SECONDS: 120,
  MOMENTUM_BONUS_MULTIPLIER: 0.15,
} as const

export interface LevelPerk {
  level: number
  startingLives: number
  startingHammers: number
  startingShields: number
  maxLives: number
}

/** Ordered ascending by level. Mirror of backend LEVEL_PERKS in _shared/types.ts. */
export const LEVEL_PERKS: LevelPerk[] = [
  { level: 1,  startingLives: 3, startingHammers: 1, startingShields: 0, maxLives: 5 },
  { level: 5,  startingLives: 3, startingHammers: 1, startingShields: 0, maxLives: 6 },
  { level: 8,  startingLives: 3, startingHammers: 1, startingShields: 1, maxLives: 6 },
  { level: 10, startingLives: 3, startingHammers: 2, startingShields: 1, maxLives: 6 },
  { level: 17, startingLives: 4, startingHammers: 2, startingShields: 1, maxLives: 6 },
  { level: 23, startingLives: 4, startingHammers: 2, startingShields: 1, maxLives: 7 },
  { level: 40, startingLives: 4, startingHammers: 3, startingShields: 1, maxLives: 7 },
  { level: 50, startingLives: 5, startingHammers: 3, startingShields: 1, maxLives: 7 },
]
