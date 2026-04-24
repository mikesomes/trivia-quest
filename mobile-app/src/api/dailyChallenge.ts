import { apiGet, apiPost } from './client'

export interface DailyChallengeStatus {
  alreadyCompleted: boolean
  challengeDate: string
  streak: number
  // Present when not completed
  roundId?: string
  totalQuestions?: number
  // Present when completed
  correctCount?: number
  xpEarned?: number
  completedAt?: string
}

export interface CompleteDailyChallengeResult {
  streak: number
  correctCount: number
  xpEarned: number
  challengeDate: string
}

export const dailyChallengeApi = {
  getStatus: () => apiGet<DailyChallengeStatus>('/get-daily-challenge'),
  complete: (roundId: string) =>
    apiPost<CompleteDailyChallengeResult>('/complete-daily-challenge', { roundId }),
}
