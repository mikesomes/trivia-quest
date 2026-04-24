import { apiPost } from './client'
import type { SubmitAnswerRequest } from '../types/api'
import type { SubmitAnswerResult } from '../types/game'

export const answersApi = {
  submit: (req: SubmitAnswerRequest) =>
    apiPost<SubmitAnswerResult>('/submit-answer', req),
}
