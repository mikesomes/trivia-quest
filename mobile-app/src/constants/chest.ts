export const CHEST_TIER_META = {
  wood:   { label: 'Wood Chest',   color: '#B08D57', emoji: '📦' },
  silver: { label: 'Silver Chest', color: '#C0C0C0', emoji: '🎁' },
  gold:   { label: 'Gold Chest',   color: '#FFD700', emoji: '🏆' },
} as const

export const CHEST_REWARD_META: Record<string, { emoji: string; label: (amount: number) => string }> = {
  coins:      { emoji: '💰', label: (n) => `+${n} Coins` },
  jackpot:    { emoji: '💎', label: (n) => `Jackpot! +${n} Coins` },
  life:       { emoji: '❤️', label: () => 'Extra Life' },
  hammer:     { emoji: '🔨', label: () => 'Hammer' },
  shield:     { emoji: '🛡️', label: () => 'Shield' },
  xp_booster: { emoji: '⚡', label: () => 'XP Booster' },
}
