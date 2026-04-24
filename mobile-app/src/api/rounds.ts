import { apiGet, apiPost } from './client'
import type { CreateRoundRequest, CreateRoundResponse, GetRoundQuestionsResponse } from '../types/api'

export const roundsApi = {
  create: (req: CreateRoundRequest) =>
    apiPost<CreateRoundResponse>('/create-round', req),

  getQuestions: (roundId: string) =>
    apiGet<GetRoundQuestionsResponse>('/get-round-questions', { roundId }),

  finish: (roundId: string) =>
    apiPost<import('../types/game').RoundResult>('/finish-round', { roundId }),
}
