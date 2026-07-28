import { SHOP_ITEMS } from './types.ts'

// Daily loot chest — tier and reward-roll logic. Pure and dependency-free
// (besides SHOP_ITEMS) so it can be unit-tested directly with an injectable rng.

export const CHEST_TIERS = {
  wood:   { minStreak: 0, coinMin: 40,  coinMax: 90,  label: 'Wood Chest' },
  silver: { minStreak: 3, coinMin: 90,  coinMax: 180, label: 'Silver Chest' },
  gold:   { minStreak: 7, coinMin: 180, coinMax: 350, label: 'Gold Chest' },
} as const

export type ChestTier = keyof typeof CHEST_TIERS

// Checked richest-first so the highest tier the streak qualifies for wins.
const TIERS_RICHEST_FIRST: ChestTier[] = ['gold', 'silver', 'wood']

export function tierForStreak(streak: number): ChestTier {
  for (const tier of TIERS_RICHEST_FIRST) {
    if (streak >= CHEST_TIERS[tier].minStreak) return tier
  }
  return 'wood'
}

export type ChestRewardType = 'coins' | 'life' | 'hammer' | 'shield' | 'xp_booster' | 'jackpot'

export interface ChestReward {
  rewardType: ChestRewardType
  amount: number
  /** Present when the reward grants shop inventory rather than coins. */
  inventoryKey?: string
}

const REWARD_WEIGHTS: Array<{ type: 'coins' | 'power_up' | 'xp_booster' | 'jackpot'; weight: number }> = [
  { type: 'coins', weight: 60 },
  { type: 'power_up', weight: 25 },
  { type: 'xp_booster', weight: 10 },
  { type: 'jackpot', weight: 5 },
]
const POWER_UP_IDS = ['life', 'hammer', 'shield'] as const
const JACKPOT_MULTIPLIER = 3

function rollCoinAmount(tier: ChestTier, multiplier: number, rng: () => number): number {
  const { coinMin, coinMax } = CHEST_TIERS[tier]
  return (coinMin + Math.floor(rng() * (coinMax - coinMin + 1))) * multiplier
}

/**
 * Roll a reward for the given tier. `inventoryCounts` (keyed by each
 * SHOP_ITEMS entry's inventoryKey) lets an already-capped power-up/booster
 * fall back to a coin reward instead of being silently wasted. `rng` is
 * injectable so tests can force a specific band deterministically.
 */
export function rollChestReward(
  tier: ChestTier,
  inventoryCounts: Record<string, number>,
  rng: () => number = Math.random,
): ChestReward {
  const total = REWARD_WEIGHTS.reduce((sum, w) => sum + w.weight, 0)
  let roll = rng() * total
  let picked: (typeof REWARD_WEIGHTS)[number]['type'] = 'coins'
  for (const w of REWARD_WEIGHTS) {
    if (roll < w.weight) {
      picked = w.type
      break
    }
    roll -= w.weight
  }

  if (picked === 'jackpot') {
    return { rewardType: 'jackpot', amount: rollCoinAmount(tier, JACKPOT_MULTIPLIER, rng) }
  }

  if (picked === 'xp_booster' || picked === 'power_up') {
    const itemId = picked === 'xp_booster'
      ? 'xp_booster'
      : POWER_UP_IDS[Math.floor(rng() * POWER_UP_IDS.length)]
    const item = SHOP_ITEMS.find(i => i.id === itemId)!
    const current = inventoryCounts[item.inventoryKey] ?? 0
    if (current < item.maxInventory) {
      return { rewardType: itemId, amount: 1, inventoryKey: item.inventoryKey }
    }
    // At cap — fall back to a coin reward rather than wasting the roll.
    return { rewardType: 'coins', amount: rollCoinAmount(tier, 1, rng) }
  }

  return { rewardType: 'coins', amount: rollCoinAmount(tier, 1, rng) }
}
