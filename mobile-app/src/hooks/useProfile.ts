import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '../api/profile'
import { queryKeys } from '../constants/queryKeys'
import { useAuthStore } from '../store/authStore'

export function useProfile() {
  const userId = useAuthStore((s) => s.userId)

  return useQuery({
    queryKey: queryKeys.profile.detail(userId ?? ''),
    queryFn: profileApi.get,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useUpdateDisplayName() {
  const queryClient = useQueryClient()
  const setDisplayName = useAuthStore((s) => s.setDisplayName)

  return useMutation({
    mutationFn: (name: string) => profileApi.setDisplayName(name),
    onSuccess: (_, name) => {
      setDisplayName(name)
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() })
    },
  })
}
