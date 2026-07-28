import type { Category, Difficulty } from './game'

export type QuestNodeType = 'standard' | 'challenge' | 'boss' | 'reward'
export type QuestMode = 'classic' | 'timed' | 'survival' | 'boss'
export type QuestNodeStatus = 'locked' | 'revealed' | 'completed'

export interface QuestStarThresholds {
  // classic/boss/survival: accuracy (0–1). timed: raw correct count.
  one: number
  two: number
  three: number
}

export interface QuestNode {
  id: string
  categoryId: string
  title: string
  description: string
  tier: number
  type: QuestNodeType
  mode: QuestMode
  difficulty: Difficulty
  questionCount: number
  rewardXp: number
  requiredNodeIds: string[]
  starThresholds: QuestStarThresholds
}

export interface QuestCategory {
  id: string
  name: string
  color: string
  category: Category
  nodes: QuestNode[]
}

export interface CategoryProgress {
  revealedNodeIds: string[]
  completedNodeIds: string[]
  bestStars: Record<string, number>
  categoryXp: number
  highestClearedTier: number
}

export interface QuestRoundResult {
  nodeId: string
  categoryId: string
  stars: number
  passed: boolean
  correctCount: number
  totalAnswered: number
  xpEarned: number
  newlyRevealedNodeIds: string[]
  isFirstClear: boolean
}
