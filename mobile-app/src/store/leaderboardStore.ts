import { create } from 'zustand'
import type { LeaderboardMode, LeaderboardPeriod } from '../types/api'
import type { Category } from '../types/game'

interface LeaderboardState {
  activeView: LeaderboardMode
  activePeriod: LeaderboardPeriod
  activeCategory: Category
  setView: (view: LeaderboardMode) => void
  setPeriod: (period: LeaderboardPeriod) => void
  setCategory: (category: Category) => void
}

export const useLeaderboardStore = create<LeaderboardState>()((set) => ({
  activeView: 'global',
  activePeriod: 'weekly',
  activeCategory: 'general_knowledge',
  setView: (view) => set({ activeView: view }),
  setPeriod: (period) => set({ activePeriod: period }),
  setCategory: (category) => set({ activeCategory: category }),
}))
