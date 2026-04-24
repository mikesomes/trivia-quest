import { apiPost } from './client'
import type { XpSubmissionResult } from '../types/user'

export const xpApi = {
  submitRound: (roundId: string, sessionRoundIds: string[]) =>
    apiPost<XpSubmissionResult>('/submit-xp', { roundId, sessionRoundIds }),
}
