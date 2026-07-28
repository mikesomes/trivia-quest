import { create } from 'zustand'
import type { LeaderboardMode, LeaderboardPeriod } from '../types/api'
import type { Category } from '../types/game'

export type GameModeTab = 'xp' | 'classic' | 'survival' | 'blitz'

interface LeaderboardState {
  activeView: LeaderboardMode
  activeGameMode: GameModeTab
  activePeriod: LeaderboardPeriod
  activeCategory: Category
  setView: (view: LeaderboardMode) => void
  setGameMode: (mode: GameModeTab) => void
  setPeriod: (period: LeaderboardPeriod) => void
  setCategory: (category: Category) => void
}

export const useLeaderboardStore = create<LeaderboardState>()((set) => ({
  activeView: 'global',
  activeGameMode: 'xp',
  activePeriod: 'weekly',
  activeCategory: 'general_knowledge',
  setView: (view) => set({ activeView: view }),
  setGameMode: (mode) => set({ activeGameMode: mode }),
  setPeriod: (period) => set({ activePeriod: period }),
  setCategory: (category) => set({ activeCategory: category }),
}))
