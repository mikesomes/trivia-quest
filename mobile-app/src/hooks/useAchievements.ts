import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { queryKeys } from '../constants/queryKeys'
import type { UserAchievement } from '../types/user'

export function useAchievements() {
  const userId = useAuthStore((s) => s.userId)

  return useQuery({
    queryKey: [...queryKeys.profile.detail(userId ?? ''), 'achievements'],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<UserAchievement[]> => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('earned_at, achievements(id, name, description, icon, rarity)')
        .eq('user_id', userId!)
        .order('earned_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((row: any) => ({
        ...row.achievements,
        earnedAt: row.earned_at,
      }))
    },
  })
}
