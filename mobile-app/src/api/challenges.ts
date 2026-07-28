import { apiGet } from './client'

export interface Challenge {
  id: string
  period: 'daily' | 'weekly'
  label: string
  emoji: string
  target: number
  xpReward: number
  progress: number
  isComplete: boolean
  periodStart: string
}

export interface ChallengesResponse {
  challenges: Challenge[]
}

export const challengesApi = {
  list: () => apiGet<ChallengesResponse>('/get-challenges'),
}
