import { useQuery } from '@tanstack/react-query'
import { challengesApi } from '../api/challenges'
import { queryKeys } from '../constants/queryKeys'

export function useChallenges() {
  return useQuery({
    queryKey: queryKeys.challenges.list(),
    queryFn: () => challengesApi.list(),
    staleTime: 30 * 1000,
  })
}
