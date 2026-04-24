import { useMutation, useQueryClient } from '@tanstack/react-query'
import { xpApi } from '../api/xp'
import { queryKeys } from '../constants/queryKeys'
import { useGameStore } from '../store/gameStore'

export function useSubmitXp() {
  const queryClient = useQueryClient()
  const setXpResult = useGameStore((s) => s.setXpResult)
  const sessionRoundIds = useGameStore((s) => s.sessionRoundIds)
  const addSessionRoundId = useGameStore((s) => s.addSessionRoundId)

  return useMutation({
    mutationFn: (roundId: string) => xpApi.submitRound(roundId, sessionRoundIds),
    onSuccess: (data, roundId) => {
      setXpResult(data)
      addSessionRoundId(roundId)
      queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() })
    },
  })
}
