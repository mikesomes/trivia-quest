import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { questApi } from '../api/quest'
import { queryKeys } from '../constants/queryKeys'
import { useAuthStore } from '../store/authStore'

export function useQuestMap() {
  const userId = useAuthStore(s => s.userId)
  return useQuery({
    queryKey: queryKeys.quest.map(userId ?? ''),
    queryFn: questApi.getMap,
    enabled: Boolean(userId),
    staleTime: 15_000,
  })
}

export function useCompleteQuestNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      nodeId,
      roundId,
      questRunId,
    }: {
      nodeId: string
      roundId: string
      questRunId?: string | null
    }) => questApi.completeNode(nodeId, roundId, questRunId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quest.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() })
    },
  })
}
