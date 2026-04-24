import { useMutation, useQueryClient } from '@tanstack/react-query'
import { suddenDeathApi } from '../api/suddenDeath'
import { queryKeys } from '../constants/queryKeys'

export function useSubmitSuddenDeath() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ roundIds }: { roundIds: string[] }) =>
      suddenDeathApi.submitRun(roundIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all() })
    },
  })
}
