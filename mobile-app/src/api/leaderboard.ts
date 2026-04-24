import { apiGet } from './client'
import type { LeaderboardMode, LeaderboardPeriod, LeaderboardResponse } from '../types/api'
import type { Category } from '../types/game'

export const leaderboardApi = {
  get: (
    mode: LeaderboardMode,
    period: LeaderboardPeriod = 'alltime',
    category?: Category | null,
    limit = 10,
  ) => {
    const params: Record<string, string> = {
      mode,
      period,
      limit: String(limit),
    }
    if (mode === 'category' && category) params.category = category
    return apiGet<LeaderboardResponse>('/get-leaderboard', params)
  },
}
