export const SHOP_ITEMS = [
  {
    id: 'life' as const,
    emoji: '❤️',
    label: 'Extra Life',
    cost: 500,
    description: 'Start your next round with +1 life',
    maxInventory: 4,
  },
  {
    id: 'hammer' as const,
    emoji: '🔨',
    label: 'Hammer',
    cost: 400,
    description: 'Start your next round with +1 hammer',
    maxInventory: 4,
  },
  {
    id: 'shield' as const,
    emoji: '🛡️',
    label: 'Shield',
    cost: 300,
    description: 'Start your next round with +1 shield',
    maxInventory: 3,
  },
  {
    id: 'xp_booster' as const,
    emoji: '⚡',
    label: 'XP Booster',
    cost: 600,
    description: '1.5× XP earned on your next round',
    maxInventory: 3,
  },
] as const

export type ShopItemId = typeof SHOP_ITEMS[number]['id']

export const INVENTORY_KEYS: Record<ShopItemId, keyof import('../types/user').UserProfile> = {
  life:       'inventory_lives',
  hammer:     'inventory_hammers',
  shield:     'inventory_shields',
  xp_booster: 'inventory_xp_booster',
}

export const EQUIPPED_KEYS: Record<ShopItemId, keyof import('../types/user').UserProfile> = {
  life:       'equipped_lives',
  hammer:     'equipped_hammers',
  shield:     'equipped_shields',
  xp_booster: 'equipped_xp_booster',
}
