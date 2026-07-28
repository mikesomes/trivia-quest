import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { queryKeys } from '../constants/queryKeys'
import { achievementsApi } from '../api/achievements'

export function useAchievements() {
  const userId = useAuthStore((s) => s.userId)

  return useQuery({
    queryKey: [...queryKeys.profile.detail(userId ?? ''), 'achievements'],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await achievementsApi.list()).achievements,
  })
}
