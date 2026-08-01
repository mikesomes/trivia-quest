import { describe, it, expect } from 'vitest'
import { getPerksForLevel } from '../../supabase/functions/_shared/scoring'

/**
 * Level perks used to be applied only inside create-round's `isQuest` branch,
 * so most of this ladder never fired for the modes players actually play. Quest
 * mode is retired and create-round now applies these on the Classic path, which
 * makes the tiers below the observable behaviour of levelling up.
 *
 * The labels in the app's src/constants/progression.ts are written against
 * these exact levels, so a change here without a change there puts the two out
 * of sync.
 */
describe('getPerksForLevel', () => {
  it('starts every new player on 3 lives, 1 hammer, no shield', () => {
    const perks = getPerksForLevel(1)
    expect(perks).toMatchObject({
      startingLives: 3,
      startingHammers: 1,
      startingShields: 0,
      maxLives: 5,
    })
  })

  it('holds the level-1 tier until the next threshold is reached', () => {
    expect(getPerksForLevel(4)).toEqual(getPerksForLevel(1))
    expect(getPerksForLevel(5)).not.toEqual(getPerksForLevel(1))
  })

  it('raises the life cap at level 5', () => {
    expect(getPerksForLevel(5).maxLives).toBe(6)
  })

  it('grants a starting shield at level 8', () => {
    expect(getPerksForLevel(7).startingShields).toBe(0)
    expect(getPerksForLevel(8).startingShields).toBe(1)
  })

  it('grants a second hammer at level 10 and a third at level 40', () => {
    expect(getPerksForLevel(9).startingHammers).toBe(1)
    expect(getPerksForLevel(10).startingHammers).toBe(2)
    expect(getPerksForLevel(40).startingHammers).toBe(3)
  })

  it('grants a fourth starting life at 17 and a fifth at 50', () => {
    expect(getPerksForLevel(16).startingLives).toBe(3)
    expect(getPerksForLevel(17).startingLives).toBe(4)
    expect(getPerksForLevel(50).startingLives).toBe(5)
  })

  it('raises the life cap again at level 23', () => {
    expect(getPerksForLevel(22).maxLives).toBe(6)
    expect(getPerksForLevel(23).maxLives).toBe(7)
  })

  it('never regresses a perk as level increases', () => {
    let previous = getPerksForLevel(1)
    for (let level = 2; level <= 60; level++) {
      const current = getPerksForLevel(level)
      expect(current.startingLives).toBeGreaterThanOrEqual(previous.startingLives)
      expect(current.startingHammers).toBeGreaterThanOrEqual(previous.startingHammers)
      expect(current.startingShields).toBeGreaterThanOrEqual(previous.startingShields)
      expect(current.maxLives).toBeGreaterThanOrEqual(previous.maxLives)
      previous = current
    }
  })

  it('clamps levels past the top tier to the level-50 perks', () => {
    expect(getPerksForLevel(99)).toEqual(getPerksForLevel(50))
  })

  it('keeps starting lives within the life cap at every tier', () => {
    for (let level = 1; level <= 50; level++) {
      const perks = getPerksForLevel(level)
      expect(perks.startingLives).toBeLessThanOrEqual(perks.maxLives)
    }
  })
})
