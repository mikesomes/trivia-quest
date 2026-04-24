import { apiPost } from './client'

export interface SuddenDeathResult {
  submissionId: string
  runXp: number
  questionsAnswered: number
  xpEarned: number
  newXp: number
  newLevel: number
  leveledUp: boolean
  rank: number
  xpToNextLevel: number
}

export const suddenDeathApi = {
  // roundIds: one per batch, collected by the game store during the run.
  // The backend verifies all rounds, sums XP, and counts correct answers —
  // the client-computed run XP and questionsAnswered are never trusted.
  submitRun: (roundIds: string[]) =>
    apiPost<SuddenDeathResult>('/submit-sudden-death', { roundIds }),
}
