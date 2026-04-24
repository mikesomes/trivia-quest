import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { QUEST_CATEGORIES } from '../config/questConfig'
import { getNewlyRevealedNodes, getNodeStatus, calculateQuestXp } from '../utils/questProgress'
import type { CategoryProgress, QuestNodeStatus, QuestRoundResult } from '../types/quest'

// ─── Initial state ────────────────────────────────────────────────────────────

function buildInitialCategoryProgress(): Record<string, CategoryProgress> {
  const result: Record<string, CategoryProgress> = {}
  for (const cat of QUEST_CATEGORIES) {
    const tier1Node = cat.nodes.find(n => n.tier === 1)
    result[cat.id] = {
      revealedNodeIds: tier1Node ? [tier1Node.id] : [],
      completedNodeIds: [],
      bestStars: {},
      categoryXp: 0,
      highestClearedTier: 0,
    }
  }
  return result
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface QuestStore {
  categoryProgress: Record<string, CategoryProgress>
  totalQuestXp: number

  getNodeStatus: (categoryId: string, nodeId: string) => QuestNodeStatus
  getCategoryProgress: (categoryId: string) => CategoryProgress
  completeNode: (result: QuestRoundResult) => void
  reset: () => void
}

const initialState = {
  categoryProgress: buildInitialCategoryProgress(),
  totalQuestXp: 0,
}

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      getNodeStatus: (categoryId, nodeId) => {
        const progress = get().categoryProgress[categoryId]
        if (!progress) return 'locked'
        return getNodeStatus(progress, nodeId)
      },

      getCategoryProgress: (categoryId) => {
        return get().categoryProgress[categoryId] ?? {
          revealedNodeIds: [],
          completedNodeIds: [],
          bestStars: {},
          categoryXp: 0,
          highestClearedTier: 0,
        }
      },

      completeNode: (result) => {
        const { nodeId, categoryId, stars, xpEarned, newlyRevealedNodeIds } = result
        if (stars === 0) return

        set((state) => {
          const prev = state.categoryProgress[categoryId] ?? {
            revealedNodeIds: [],
            completedNodeIds: [],
            bestStars: {},
            categoryXp: 0,
            highestClearedTier: 0,
          }

          const prevBestStars = prev.bestStars[nodeId] ?? 0
          const isImprovement = stars > prevBestStars

          const category = QUEST_CATEGORIES.find(c => c.id === categoryId)
          const node = category?.nodes.find(n => n.id === nodeId)

          const newCompletedIds = prev.completedNodeIds.includes(nodeId)
            ? prev.completedNodeIds
            : [...prev.completedNodeIds, nodeId]

          // Reveal next nodes
          const newlyRevealed = category
            ? getNewlyRevealedNodes(category, newCompletedIds).map(n => n.id)
            : []
          const newRevealedIds = Array.from(new Set([...prev.revealedNodeIds, ...newlyRevealed]))

          const xpToAdd = isImprovement || result.isFirstClear ? xpEarned : 0

          const updated: CategoryProgress = {
            revealedNodeIds: newRevealedIds,
            completedNodeIds: newCompletedIds,
            bestStars: isImprovement
              ? { ...prev.bestStars, [nodeId]: stars }
              : prev.bestStars,
            categoryXp: prev.categoryXp + xpToAdd,
            highestClearedTier: node
              ? Math.max(prev.highestClearedTier, node.tier)
              : prev.highestClearedTier,
          }

          return {
            categoryProgress: { ...state.categoryProgress, [categoryId]: updated },
            totalQuestXp: state.totalQuestXp + xpToAdd,
          }
        })

        // Haptics
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
        if (newlyRevealedNodeIds.length > 0) {
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
          }, 400)
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'trivia-quest-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
