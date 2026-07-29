import { describe, expect, it } from 'vitest'
import { isFirstClearRewardEligible } from '../../supabase/functions/_shared/questReward'

describe('quest first-clear reward eligibility', () => {
  it('grants loot on the first successful clear', () => {
    expect(isFirstClearRewardEligible(true, 0)).toBe(true)
  })

  it('does not grant loot for a failed attempt', () => {
    expect(isFirstClearRewardEligible(false, 0)).toBe(false)
  })

  it('does not grant loot when a completed node is replayed', () => {
    expect(isFirstClearRewardEligible(true, 1)).toBe(false)
    expect(isFirstClearRewardEligible(true, 3)).toBe(false)
  })
})
