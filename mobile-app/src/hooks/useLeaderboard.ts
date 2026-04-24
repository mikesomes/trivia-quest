import { useQuery } from '@tanstack/react-query'
import { leaderboardApi } from '../api/leaderboard'
import { queryKeys } from '../constants/queryKeys'
import type { LeaderboardMode, LeaderboardPeriod } from '../types/api'
import type { Category } from '../types/game'

export function useLeaderboard(
  mode: LeaderboardMode,
  period: LeaderboardPeriod = 'alltime',
  category?: Category | null,
) {
  return useQuery({
    queryKey: queryKeys.leaderboard.list(mode, period, category),
    queryFn: () => leaderboardApi.get(mode, period, category),
    staleTime: 60 * 1000,
  })
}
