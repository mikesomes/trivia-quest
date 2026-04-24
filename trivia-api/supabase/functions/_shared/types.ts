export type Category =
  | 'general_knowledge'
  | 'history'
  | 'science'
  | 'sports'
  | 'movies_tv'
  | 'geography'
  | 'nfl_football'
  | 'roman_history'
  | 'harry_potter'
  | 'famous_quotes'
  | 'music'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'boss'
export type ScoringTimerMode = 'question' | 'round'

export interface DifficultyMix {
  easy: number
  medium: number
  hard: number
}

export type RoundStatus = 'active' | 'completed' | 'abandoned'

export interface User {
  id: string
  display_name: string
  level: number
  xp: number
  coins: number
  inventory_lives: number
  inventory_hammers: number
  inventory_shields: number
  inventory_xp_booster: number
  total_games: number
  total_correct: number
  best_score: number
  is_anonymous: boolean
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  category: Category
  difficulty: Difficulty
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: 'a' | 'b' | 'c' | 'd'
  explanation: string | null
  content_hash: string
  source: string
  times_used: number
  is_active: boolean
  created_at: string
}

export interface Round {
  id: string
  user_id: string
  category: Category
  difficulty: Difficulty
  status: RoundStatus
  lives_remaining: number
  hammers: number
  shields: number
  current_question_index: number
  streak: number
  is_quest: boolean
  xp_earned_in_round: number
  max_lives: number
  scoring_timer_mode: ScoringTimerMode
  is_blitz: boolean
  xp_booster_active: boolean
  started_at: string
  completed_at: string | null
  expires_at: string
}

export interface Answer {
  id: string
  round_id: string
  question_id: string
  position: number
  selected_option: string | null
  is_correct: boolean
  time_taken_ms: number
  points_awarded: number
  time_bonus: number
  streak_bonus: number
  streak_at_time: number
  submitted_at: string
}

export interface XpBreakdown {
  base: number
  timeBonus: number
  difficultyBonus: number
  streakBonus: number
  difficultyMultiplier: number
  comboMultiplier: number
  total: number
  newStreak: number
  timing: ActiveScoringTimerSnapshot
}

export interface ActiveScoringTimerSnapshot {
  mode: ScoringTimerMode
  durationMs: number
  elapsedMs: number
  remainingMs: number
}

export interface RoundXpBreakdown {
  answerBase: number
  speedBonus: number
  difficultyBonus: number
  streakBonus: number
  answerXp: number
  completionBonus: number
  perfectBonus: number
  noLivesLostBonus: number
  dailyChallengeBonus: number
  firstRoundBonus: number
  total: number
}

export const CATEGORIES: Category[] = [
  'general_knowledge',
  'history',
  'science',
  'sports',
  'movies_tv',
  'geography',
  'nfl_football',
  'roman_history',
  'harry_potter',
  'famous_quotes',
  'music',
]

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export const GAME_CONSTANTS = {
  QUESTIONS_PER_ROUND: 10,
  TIMER_SECONDS: 15,
  BLITZ_SECONDS: 60,
  BLITZ_QUESTIONS: 30,
  BLITZ_TIME_BONUS_MS: 5000,
  BLITZ_STREAK_THRESHOLD: 3,
  STARTING_LIVES: 3,
  STARTING_HAMMERS: 1,
  STARTING_SHIELDS: 0,
  MAX_LIVES: 7,
  MAX_HAMMERS: 5,
  ROUND_EXPIRY_MINUTES: 15,
  QUESTION_BANK_MIN: 30,
} as const

/** A perk tier applied at quest round start based on player level */
export interface LevelPerk {
  level: number
  startingLives: number
  startingHammers: number
  startingShields: number
  maxLives: number
}

export const SHOP_ITEMS = [
  { id: 'life',       cost: 500, inventoryKey: 'inventory_lives',       maxInventory: 4 },
  { id: 'hammer',     cost: 400, inventoryKey: 'inventory_hammers',     maxInventory: 4 },
  { id: 'shield',     cost: 300, inventoryKey: 'inventory_shields',     maxInventory: 3 },
  { id: 'xp_booster', cost: 600, inventoryKey: 'inventory_xp_booster', maxInventory: 3 },
] as const
export type ShopItemId = typeof SHOP_ITEMS[number]['id']

/** Ordered ascending by level. Each entry is the perk for that level and above. */
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
