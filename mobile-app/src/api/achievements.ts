import { apiGet } from './client'
import type { AchievementCatalogueEntry } from '../types/user'

export interface AchievementsResponse {
  achievements: AchievementCatalogueEntry[]
}

export const achievementsApi = {
  list: () => apiGet<AchievementsResponse>('/get-achievements'),
}
