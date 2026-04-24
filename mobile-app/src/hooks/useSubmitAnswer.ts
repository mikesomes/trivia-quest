import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { answersApi } from '../api/answers'
import { isAlreadyAnsweredError } from '../api/client'
import { queryKeys } from '../constants/queryKeys'
import { useGameStore } from '../store/gameStore'
import type { SubmitAnswerRequest } from '../types/api'
import { isShieldBreakResult } from '../types/game'

export function useSubmitAnswer() {
  const queryClient = useQueryClient()
  const recordAnswer = useGameStore((s) => s.recordAnswer)
  const resetAnswerState = useGameStore((s) => s.resetAnswerState)

  return useMutation({
    mutationFn: (req: SubmitAnswerRequest) => answersApi.submit(req),
    onSuccess: (data) => {
      if (isShieldBreakResult(data)) {
        return
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
