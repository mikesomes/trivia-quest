import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { router } from 'expo-router'
import { dailyChallengeApi } from '../api/dailyChallenge'
import { queryKeys } from '../constants/queryKeys'
import { useGameStore } from '../store/gameStore'
import { roundsApi } from '../api/rounds'

export function useDailyChallengeStatus() {
  const queryClient = useQueryClient()

  // Refetch whenever the app comes back to the foreground (covers overnight resume
  // and returning after Eastern midnight without a full app restart).
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenge.status() })
      }
    })
    return () => sub.remove()
  }, [queryClient])

  return useQuery({
    queryKey: queryKeys.dailyChallenge.status(),
    queryFn: () => dailyChallengeApi.getStatus(),
    staleTime: 60 * 1000, // periodic recheck catches midnight rollover while app stays open
  })
}

export function useStartDailyChallenge() {
  const queryClient = useQueryClient()
  const startRound = useGameStore((s) => s.startRound)
  const setIsDailyChallenge = useGameStore((s) => s.setIsDailyChallenge)

  return useMutation({
    mutationFn: async () => {
      const status = await dailyChallengeApi.getStatus()
      if (status.alreadyCompleted || !status.roundId) throw new Error('Already completed or no round')
      // Pre-fetch questions (same pattern as useCreateRound)
      const questionsData = await roundsApi.getQuestions(status.roundId)
      return { status, questionsData }
    },
    onSuccess: ({ status, questionsData }) => {
      queryClient.setQueryData(
        queryKeys.round.questions(status.roundId!),
        questionsData
      )
      setIsDailyChallenge(true)
      startRound(
        status.roundId!,
        questionsData.questions,
        questionsData.livesRemaining,
        questionsData.streak,
        questionsData.currentPosition,
        questionsData.hammers,
        questionsData.xpEarnedInRound,
        questionsData.scoringTimerMode,
        questionsData.shields
      )
      router.push('/game/play')
    },
  })
}

export function useCompleteDailyChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (roundId: string) => dailyChallengeApi.complete(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenge.status() })
    },
  })
}
