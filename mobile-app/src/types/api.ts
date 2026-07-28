import type {
  Category,
  Difficulty,
  Question,
  AnswerOption,
  AnswerResult,
  RoundResult,
  ActiveScoringTimerSnapshot,
  ScoringTimerMode,
  SubmitAnswerResult,
} from './game'
import type { UserProfile, XpSubmissionResult } from './user'

export interface DifficultyMix {
  easy: number
  medium: number
  hard: number
}

export interface CreateRoundRequest {
  category: Category
  difficulty: Difficulty
  difficultyMix?: DifficultyMix
  difficultySegments?: DifficultyMix[]
  isSurvival?: boolean
  isQuest?: boolean
  isBlitz?: boolean
  questNodeId?: string
  continuationRoundId?: string
  questRunId?: string
}

export interface CreateRoundResponse {
  roundId: string
  category: Category
  difficulty: Difficulty
  totalQuestions: number
  expiresAt: string
  scoringTimerMode?: ScoringTimerMode
}

export interface GetRoundQuestionsResponse {
  roundId: string
  category: Category
  difficulty: Difficulty
  currentPosition: number
  livesRemaining: number
  hammers: number
  shields: number
  xpEarnedInRound: number
  streak: number
  maxStreak?: number
  scoringTimerMode: ScoringTimerMode
  expiresAt?: string
  questions: Question[]
}

export interface UseHammerRequest {
  roundId: string
  questionId: string
  position: number
}

export interface UseHammerResponse {
  eliminatedOptions: AnswerOption[]
  hammersRemaining: number
}

export interface SubmitAnswerRequest {
  roundId: string
  questionId: string
  position: number
  selectedOption: AnswerOption | null
  timeTakenMs: number
  activeTimer: ActiveScoringTimerSnapshot
  useShield?: boolean
}

export type LeaderboardMode = 'global' | 'category' | 'xp' | 'classic' | 'survival' | 'blitz'
export type LeaderboardPeriod = 'today' | 'weekly' | 'alltime'

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  level: number
  primaryValue: number
  gamesPlayed?: number
  previousRank?: number | null
  sessionRound?: number
  totalQuestions?: number
  questionsAnswered?: number
  correctCount?: number
}

export interface LeaderboardResponse {
  mode: LeaderboardMode
  period?: string
  category?: string
  entries: LeaderboardEntry[]
  total: number
  userEntry: { rank: number; primaryValue: number; previousRank?: number | null } | null
}

export interface PurchaseItemRequest {
  itemId: 'life' | 'hammer' | 'shield' | 'xp_booster' | 'streak_freeze'
  quantity: number
}

export interface PurchaseItemResponse {
  success: boolean
  coinsRemaining: number
  newInventoryCount: number
}

export interface EquipItemsRequest {
  equipped_lives: number
  equipped_hammers: number
  equipped_shields: number
  equipped_xp_booster: number
}

export interface EquipItemsResponse {
  equipped_lives: number
  equipped_hammers: number
  equipped_shields: number
  equipped_xp_booster: number
}

export type { UserProfile, XpSubmissionResult, AnswerResult, RoundResult, SubmitAnswerResult }
