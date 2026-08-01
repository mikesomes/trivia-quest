// Chest tier config. Originally backed the daily loot chest's streak-based
// tier progression; that feature is gone (see get-daily-reward/claim-daily-reward
// removal), but Knowledge Isles quest node rewards reuse this same tier config
// for their loot preview (see get-quest-map), so it stays.

export const CHEST_TIERS = {
  wood:   { coinMin: 40,  coinMax: 90,  label: 'Wood Chest' },
  silver: { coinMin: 90,  coinMax: 180, label: 'Silver Chest' },
  gold:   { coinMin: 180, coinMax: 350, label: 'Gold Chest' },
} as const

export type ChestTier = keyof typeof CHEST_TIERS
