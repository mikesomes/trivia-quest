import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dailyRewardApi } from '../api/dailyReward'
import { queryKeys } from '../constants/queryKeys'

export function useDailyRewardStatus() {
  return useQuery({
    queryKey: queryKeys.dailyReward.status(),
    queryFn: () => dailyRewardApi.getStatus(),
    staleTime: 60 * 1000,
  })
}

export function useClaimDailyReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => dailyRewardApi.claim(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyReward.status() })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() })
    },
  })
}
