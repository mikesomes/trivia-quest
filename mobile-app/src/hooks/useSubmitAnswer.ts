import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
        // Recovery for this one is the screen's job — it has to decide whether
        // to skip the question or end the round. Leave the state alone.
        return
      }

      // Back to 'idle' so the player can simply tap again. The screen surfaces
      // an inline notice; a modal alert here ejected them from the question
      // over what is usually a one-second network blip.
      resetAnswerState()
    },
  })
}
