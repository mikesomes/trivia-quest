import { describe, it, expect } from 'vitest'
// Imports the actual production module (dependency-free besides SHOP_ITEMS).
import { tierForStreak, rollChestReward } from '../../supabase/functions/_shared/chest'

const emptyInventory = { inventory_lives: 0, inventory_hammers: 0, inventory_shields: 0, inventory_xp_booster: 0 }
const fullInventory = { inventory_lives: 4, inventory_hammers: 4, inventory_shields: 3, inventory_xp_booster: 3 }

describe('tierForStreak', () => {
  it('starts at wood', () => {
    expect(tierForStreak(0)).toBe('wood')
    expect(tierForStreak(2)).toBe('wood')
  })

  it('reaches silver at 3 consecutive days', () => {
    expect(tierForStreak(3)).toBe('silver')
    expect(tierForStreak(6)).toBe('silver')
  })

  it('reaches gold at 7 consecutive days and stays there', () => {
    expect(tierForStreak(7)).toBe('gold')
    expect(tierForStreak(100)).toBe('gold')
  })
})

describe('rollChestReward', () => {
  it('rolls coins at the bottom of the weight range', () => {
    const reward = rollChestReward('wood', emptyInventory, () => 0)
    expect(reward.rewardType).toBe('coins')
    expect(reward.amount).toBeGreaterThanOrEqual(40)
    expect(reward.amount).toBeLessThanOrEqual(90)
  })

  it('rolls a jackpot with a multiplied coin amount at the top of the weight range', () => {
    const reward = rollChestReward('wood', emptyInventory, () => 0.999999)
    expect(reward.rewardType).toBe('jackpot')
    expect(reward.amount).toBeGreaterThanOrEqual(40 * 3)
    expect(reward.amount).toBeLessThanOrEqual(90 * 3)
  })

  it('grants a power-up when inventory has room', () => {
    const reward = rollChestReward('wood', emptyInventory, () => 0.65)
    expect(['life', 'hammer', 'shield']).toContain(reward.rewardType)
    expect(reward.amount).toBe(1)
    expect(reward.inventoryKey).toBeDefined()
  })

  it('falls back to coins instead of wasting a roll when the power-up is capped', () => {
    const reward = rollChestReward('wood', fullInventory, () => 0.65)
    expect(reward.rewardType).toBe('coins')
    expect(reward.inventoryKey).toBeUndefined()
  })

  it('falls back to coins when xp_booster is capped', () => {
    const reward = rollChestReward('wood', fullInventory, () => 0.9)
    expect(reward.rewardType).toBe('coins')
  })

  it('scales the coin range up for higher tiers', () => {
    const silver = rollChestReward('silver', emptyInventory, () => 0)
    expect(silver.amount).toBeGreaterThanOrEqual(90)
    expect(silver.amount).toBeLessThanOrEqual(180)

    const gold = rollChestReward('gold', emptyInventory, () => 0)
    expect(gold.amount).toBeGreaterThanOrEqual(180)
    expect(gold.amount).toBeLessThanOrEqual(350)
  })
})
