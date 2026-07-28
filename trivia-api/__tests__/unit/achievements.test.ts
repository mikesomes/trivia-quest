import { describe, it, expect } from 'vitest'
import { thresholdConditions, GAMES_TARGETS, SURVIVAL_TARGETS } from '../../supabase/functions/_shared/achievementLogic'

describe('thresholdConditions', () => {
  it('marks every tier met when value clears the top target', () => {
    const result = thresholdConditions('games', GAMES_TARGETS, 150)
    expect(result).toEqual({ games_10: true, games_50: true, games_100: true })
  })

  it('marks only lower tiers met for a mid-range value', () => {
    const result = thresholdConditions('survival', SURVIVAL_TARGETS, 25)
    expect(result).toEqual({ survival_10: true, survival_25: true, survival_50: false })
  })

  it('marks nothing met below the lowest tier', () => {
    const result = thresholdConditions('games', GAMES_TARGETS, 3)
    expect(result).toEqual({ games_10: false, games_50: false, games_100: false })
  })

  it('is inclusive at the exact target value', () => {
    const result = thresholdConditions('survival', SURVIVAL_TARGETS, 10)
    expect(result.survival_10).toBe(true)
  })

  it('produces ids matching the "<prefix>_<target>" achievement id convention', () => {
    const result = thresholdConditions('day_streak', [7, 30, 100], 30)
    expect(Object.keys(result)).toEqual(['day_streak_7', 'day_streak_30', 'day_streak_100'])
  })
})
