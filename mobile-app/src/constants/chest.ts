import type { GameIconName } from '../components/icons'

export const CHEST_TIER_META = {
  wood:   { label: 'Wood Chest',   color: '#B08D57', icon: 'chest'  as GameIconName },
  silver: { label: 'Silver Chest', color: '#C0C0C0', icon: 'gift'   as GameIconName },
  gold:   { label: 'Gold Chest',   color: '#FFD700', icon: 'trophy' as GameIconName },
} as const

export const CHEST_REWARD_META: Record<string, { icon: GameIconName; label: (amount: number) => string }> = {
  coins:      { icon: 'coin',    label: (n) => `+${n} Coins` },
  jackpot:    { icon: 'jackpot', label: (n) => `Jackpot! +${n} Coins` },
  life:       { icon: 'life',    label: () => 'Extra Life' },
  hammer:     { icon: 'hammer',  label: () => 'Hammer' },
  shield:     { icon: 'shield',  label: () => 'Shield' },
  xp_booster: { icon: 'xp',      label: () => 'XP Booster' },
}
