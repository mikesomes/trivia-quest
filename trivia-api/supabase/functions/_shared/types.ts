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
  | 'odd_one_out'
  | 'video_games'

// 'boss' exists only on quest nodes; boss rounds draw 'hard' questions
// (mapped in create-round and start-quest-node-run), so question_bank and
// the generation pipeline (DIFFICULTIES below) never use it.
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
  /** Present only when the round started within the momentum window (see MOMENTUM_WINDOW_MS). */
  momentumBonus?: number
}

/**
 * Playable categories.
 *
 * This is the runtime allow-list, not the full set of values the database may
 * hold — same relationship DIFFICULTIES has to Difficulty. isValidCategory
 * checks against this, so dropping an entry is what actually takes a category
 * out of play: create-round rejects it and topUpAll stops generating for it.
 *
 * 'nfl_football', 'roman_history' and 'harry_potter' stay in the Category
 * union because historical rounds, scores and question rows still carry them;
 * they are only absent here. See migrations 20240068 and 20240069 for why each
 * is out and what bringing it back involves.
 *
 * 'odd_one_out' is out for a different reason: it was never a distinct game
 * mechanic, just a category wearing a "mode" costume (its own entry in
 * mode-select alongside classic/blitz/survival, despite reusing the exact
 * same question-answering flow). That dual modeling was confusing enough to
 * retire outright rather than fix. Unlike the three above, it isn't coming
 * back — see migration 20240074.
 */
export const CATEGORIES: Category[] = [
  'general_knowledge',
  'history',
  'science',
  'sports',
  'movies_tv',
  'geography',
  'famous_quotes',
  'music',
  'video_games',
]

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export const GAME_CONSTANTS = {
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
  ROUND_EXPIRY_MINUTES: 15,
  // Minimum active questions per category/difficulty before top-up kicks in.
  //
  // 30 was below one Classic round's worth of headroom and a third of a single
  // Blitz round, which draws 30 questions from one category. 150 per bucket is
  // 450 per category — roughly 15 Blitz rounds or 45 Classic rounds before a
  // player can see a repeat.
  //
  // Measured against the live bank this targets exactly the starved buckets:
  // odd_one_out sits at 12/12/12 and famous_quotes at 98/72/94, while every
  // other category is already above 150. Raise again once those fill; going
  // straight to a higher number would just queue generation for categories
  // that do not need it.
  QUESTION_BANK_MIN: 150,
  MOMENTUM_WINDOW_MS: 2 * 60 * 1000,
  MOMENTUM_BONUS_MULTIPLIER: 0.15,
} as const

/** A perk tier applied at Classic round start based on player level */
export interface LevelPerk {
  level: number
  startingLives: number
  startingHammers: number
  startingShields: number
  maxLives: number
}

export const SHOP_ITEMS = [
  { id: 'life',          cost: 500, inventoryKey: 'inventory_lives',      maxInventory: 4 },
  { id: 'hammer',        cost: 400, inventoryKey: 'inventory_hammers',    maxInventory: 4 },
  { id: 'shield',        cost: 300, inventoryKey: 'inventory_shields',    maxInventory: 3 },
  { id: 'xp_booster',    cost: 600, inventoryKey: 'inventory_xp_booster', maxInventory: 3 },
  { id: 'streak_freeze', cost: 800, inventoryKey: 'streak_freezes',       maxInventory: 2 },
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
