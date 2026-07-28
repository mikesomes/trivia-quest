import type { QuestNode, QuestCategory, QuestNodeStatus, CategoryProgress } from '../types/quest'
import type { Category, Difficulty } from '../types/game'
import type { DifficultyMix } from './difficultyMix'
import { getNormalRoundMix } from './difficultyMix'
import { GAME_CONFIG } from '../constants/game'

// ─── Star calculation ─────────────────────────────────────────────────────────

export function calculateStars(
  node: QuestNode,
  correctCount: number,
  totalAnswered: number,
): number {
  const { starThresholds: t, mode } = node

  if (mode === 'timed') {
    // Blitz: raw correct count within GAME_CONFIG.BLITZ_SECONDS
    if (correctCount >= t.three) return 3
    if (correctCount >= t.two)   return 2
    if (correctCount >= t.one)   return 1
    return 0
  }

  // classic / boss / survival: accuracy-based
  const accuracy = totalAnswered > 0 ? correctCount / totalAnswered : 0
  if (accuracy >= t.three) return 3
  if (accuracy >= t.two)   return 2
  if (accuracy >= t.one)   return 1
  return 0
}

// ─── XP calculation ───────────────────────────────────────────────────────────

export function calculateQuestXp(
  node: QuestNode,
  stars: number,
  isFirstClear: boolean,
  previousBestStars: number,
): number {
  if (stars === 0) return 0
  if (isFirstClear) return node.rewardXp
  const delta = stars - previousBestStars
  if (delta <= 0) return 0
  return Math.round(node.rewardXp * 0.25 * delta)
}

// ─── Reveal logic ─────────────────────────────────────────────────────────────

export function getNewlyRevealedNodes(
  category: QuestCategory,
  completedNodeIds: string[],
): QuestNode[] {
  const completedSet = new Set(completedNodeIds)
  return category.nodes.filter(
    n =>
      !completedSet.has(n.id) &&
      n.requiredNodeIds.length > 0 &&
      n.requiredNodeIds.every(req => completedSet.has(req))
  )
}

// ─── Node status ──────────────────────────────────────────────────────────────

export function getNodeStatus(progress: CategoryProgress, nodeId: string): QuestNodeStatus {
  if (progress.completedNodeIds.includes(nodeId)) return 'completed'
  if (progress.revealedNodeIds.includes(nodeId))  return 'revealed'
  return 'locked'
}

// ─── Category stats ───────────────────────────────────────────────────────────

export interface CategoryStats {
  completedCount: number
  totalCount: number
  totalStars: number
  maxStars: number
  completionPct: number
  highestClearedTier: number
}

export function buildCategoryStats(
  category: QuestCategory,
  progress: CategoryProgress,
): CategoryStats {
  const totalCount = category.nodes.length
  const completedCount = progress.completedNodeIds.length
  const totalStars = Object.values(progress.bestStars).reduce((s, v) => s + v, 0)
  const maxStars = totalCount * 3

  return {
    completedCount,
    totalCount,
    totalStars,
    maxStars,
    completionPct: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    highestClearedTier: progress.highestClearedTier,
  }
}

// ─── Round params ─────────────────────────────────────────────────────────────

export interface QuestRoundParams {
  category: Category
  difficulty: Difficulty
  isSurvival?: boolean
  isBlitz?: boolean
  difficultyMix?: DifficultyMix
}

export function getCreateRoundParams(node: QuestNode): QuestRoundParams {
  // categoryId matches the Category API value 1:1 for all quest categories
  const category = node.categoryId as Category
  const { difficulty, mode } = node

  if (mode === 'timed') {
    return { category, difficulty, isBlitz: true }
  }

  if (mode === 'survival') {
    return { category, difficulty, isSurvival: true }
  }

  // classic or boss
  return {
    category,
    difficulty,
    difficultyMix: getNormalRoundMix(difficulty, GAME_CONFIG.QUESTIONS_PER_ROUND),
  }
}
