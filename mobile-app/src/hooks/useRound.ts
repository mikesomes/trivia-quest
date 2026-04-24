import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { roundsApi } from '../api/rounds'
import { queryKeys } from '../constants/queryKeys'
import { useGameStore } from '../store/gameStore'
import type { CreateRoundRequest } from '../types/api'

export function useCreateRound() {
  const queryClient = useQueryClient()
  const startRound = useGameStore((s) => s.startRound)

  return useMutation({
    mutationFn: (req: CreateRoundRequest) => roundsApi.create(req),
    onSuccess: async (data) => {
      // Pre-fetch questions immediately after round creation
      const questionsData = await roundsApi.getQuestions(data.roundId)
      queryClient.setQueryData(queryKeys.round.questions(data.roundId), questionsData)
      startRound(
        data.roundId,
        questionsData.questions,
        questionsData.livesRemaining,
        questionsData.streak,
        questionsData.currentPosition,
        questionsData.hammers,
        questionsData.xpEarnedInRound,
        questionsData.scoringTimerMode,
        questionsData.shields
      )
    },
  })
}

export function useRoundQuestions(roundId: string | null) {
  return useQuery({
    queryKey: queryKeys.round.questions(roundId ?? ''),
    queryFn: () => roundsApi.getQuestions(roundId!),
    enabled: !!roundId,
    staleTime: Infinity, // questions don't change during a round
  })
}

export function useFinishRound() {
  const queryClient = useQueryClient()
  const setRoundResult = useGameStore((s) => s.setRoundResult)

  return useMutation({
    mutationFn: (roundId: string) => roundsApi.finish(roundId),
    onSuccess: (data, roundId) => {
      setRoundResult(data)
      queryClient.setQueryData(queryKeys.round.result(roundId), data)
    },
  })
}
