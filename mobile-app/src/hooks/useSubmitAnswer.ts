import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { answersApi } from '../api/answers'
import { isAlreadyAnsweredError } from '../api/client'
import { queryKeys } from '../constants/queryKeys'
import { useGameStore } from '../store/gameStore'
import type { SubmitAnswerRequest } from '../types/api'
import { isShieldBreakResult } from '../types/game'

// Minimum time the option sits in "pending" before the reveal fires — a felt
// beat of anticipation even when the server responds near-instantly. Never
// adds delay on top of an already-slow response.
const MIN_REVEAL_DELAY_MS = 200

export function useSubmitAnswer() {
  const queryClient = useQueryClient()
  const recordAnswer = useGameStore((s) => s.recordAnswer)
  const resetAnswerState = useGameStore((s) => s.resetAnswerState)
  const selectedAtRef = useRef(0)

  return useMutation({
    mutationFn: (req: SubmitAnswerRequest) => answersApi.submit(req),
    onMutate: () => {
      selectedAtRef.current = Date.now()
    },
    onSuccess: async (data) => {
      if (isShieldBreakResult(data)) {
        return
      }

      const remaining = MIN_REVEAL_DELAY_MS - (Date.now() - selectedAtRef.current)
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }

      recordAnswer(data)
      if (data.newXp !== undefined) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() })
      }
    },
    onError: (error) => {
      if (isAlreadyAnsweredError(error)) {
        return
      }

      resetAnswerState()
      Alert.alert('Connection Error', 'Could not submit answer. Check your connection and try again.')
    },
  })
}
