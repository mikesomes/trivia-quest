export const SHOP_ITEMS = [
  {
    id: 'life' as const,
    emoji: '❤️',
    label: 'Extra Life',
    cost: 500,
    description: 'Start your next round with +1 life',
    maxInventory: 4,
    equippable: true,
  },
  {
    id: 'hammer' as const,
    emoji: '🔨',
    label: 'Hammer',
    cost: 400,
    description: 'Start your next round with +1 hammer',
    maxInventory: 4,
    equippable: true,
  },
  {
    id: 'shield' as const,
    emoji: '🛡️',
    label: 'Shield',
    cost: 300,
    description: 'Start your next round with +1 shield',
    maxInventory: 3,
    equippable: true,
  },
  {
    id: 'xp_booster' as const,
    emoji: '⚡',
    label: 'XP Booster',
    cost: 600,
    description: '1.5× XP earned on your next round',
    maxInventory: 3,
    equippable: true,
  },
  {
    id: 'streak_freeze' as const,
    emoji: '🧊',
    label: 'Streak Freeze',
    cost: 800,
    description: 'Automatically saves your day streak if you miss a day',
    maxInventory: 2,
    equippable: false,
  },
] as const

export type ShopItemId = typeof SHOP_ITEMS[number]['id']

export const INVENTORY_KEYS: Record<ShopItemId, keyof import('../types/user').UserProfile> = {
  life:          'inventory_lives',
  hammer:        'inventory_hammers',
  shield:        'inventory_shields',
  xp_booster:    'inventory_xp_booster',
  streak_freeze: 'streakFreezes',
}

/** Only equippable items appear here — streak freezes work passively. */
export const EQUIPPED_KEYS: Partial<Record<ShopItemId, keyof import('../types/user').UserProfile>> = {
  life:       'equipped_lives',
  hammer:     'equipped_hammers',
  shield:     'equipped_shields',
  xp_booster: 'equipped_xp_booster',
}
