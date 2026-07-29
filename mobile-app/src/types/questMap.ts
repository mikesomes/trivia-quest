import type { Category, Difficulty } from './game'

export type QuestLootTier = 'wood' | 'silver' | 'gold'
export type QuestMapStatus = 'locked' | 'available' | 'completed' | 'cooldown'
export type QuestUnlockRule = 'all' | 'any'

export interface QuestRewardPreview {
  label: string
  coinMin: number
  coinMax: number
  possibleTypes: string[]
}

export interface QuestMapNode {
  id: string
  title: string
  description: string
  category: Category
  difficulty: Difficulty | 'boss'
  gameMode: 'classic' | 'blitz' | 'survival' | 'boss_battle' | 'streak'
  branch: string
  positionX: number
  positionY: number
  regionId: string
  visualMetadata: {
    landmark?: string
    accent?: string
    mapLabel?: string
  }
  unlockRule: QuestUnlockRule
  xpReward: number
  lootTier: QuestLootTier
  rewardPreview: QuestRewardPreview
  status: QuestMapStatus
  stars: number
  bestXp: number
  attempts: number
  completedAt: string | null
  failureCount: number
  cooldownUntil: string | null
  roundsTotal: number
}

export interface QuestMapConnection {
  from: string
  to: string
}

export interface QuestMapResponse {
  nodes: QuestMapNode[]
  connections: QuestMapConnection[]
  userLevel: number
}

export interface StartQuestNodeResponse {
  isMultiRound: boolean
  runId: string | null
  roundsTotal: number
  currentRoundIndex: number
  firstRound: {
    gameMode: QuestMapNode['gameMode']
    category: Category
    difficulty: Difficulty
    modeConfig: Record<string, unknown>
  }
}

export interface QuestReward {
  tier: QuestLootTier
  rewardType: 'coins' | 'life' | 'hammer' | 'shield' | 'xp_booster' | 'jackpot'
  amount: number
  alreadyClaimed: boolean
}

export interface CompleteQuestNodeResponse {
  passed: boolean
  stars: number
  previousStars: number
  accuracy: number
  correctCount: number
  totalAnswers: number
  maxStreak: number
  gameMode: string
  xpAwarded: number
  roundXp: number
  reward: QuestReward | null
  cooldownUntil: string | null
  failureCount: number
  runComplete?: boolean
  roundPassed?: boolean
  roundStars?: number
}
