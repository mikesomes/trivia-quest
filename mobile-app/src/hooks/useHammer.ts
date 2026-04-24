import { useMutation } from '@tanstack/react-query'
import { hammersApi } from '../api/hammers'
import { useGameStore } from '../store/gameStore'
import type { UseHammerRequest } from '../types/api'

export function useHammer() {
  return useMutation({
    mutationFn: (req: UseHammerRequest) => hammersApi.use(req),
    onSuccess: (data) => {
      useGameStore.setState({ hammers: data.hammersRemaining })
    },
  })
}
