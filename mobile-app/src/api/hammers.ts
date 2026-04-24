import { apiPost } from './client'
import type { UseHammerRequest, UseHammerResponse } from '../types/api'

export const hammersApi = {
  use: (req: UseHammerRequest) =>
    apiPost<UseHammerResponse>('/use-hammer', req),
}
