import { apiGet, apiPost } from './client'
import type { Achievement } from '../types/user'

export type ChestTier = 'wood' | 'silver' | 'gold'
export type ChestRewardType = 'coins' | 'life' | 'hammer' | 'shield' | 'xp_booster' | 'jackpot'

export interface ChestReward {
  type: ChestRewardType
  amount: number
}

export interface DailyRewardStatus {
  alreadyClaimed: boolean
  tier: ChestTier
  chestStreak: number
  longestChestStreak: number
  claimDate: string
  reward?: ChestReward
}

export interface ClaimDailyRewardResult {
  alreadyClaimed: boolean
  tier: ChestTier
  reward: ChestReward
  chestStreak: number
  longestChestStreak: number
  newCoins: number
  newAchievements: Achievement[]
}

export const dailyRewardApi = {
  getStatus: () => apiGet<DailyRewardStatus>('/get-daily-reward'),
  claim: () => apiPost<ClaimDailyRewardResult>('/claim-daily-reward'),
}
