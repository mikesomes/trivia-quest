import { describe, it, expect } from 'vitest'
import { CATEGORIES, DIFFICULTIES } from '../../supabase/functions/_shared/types.ts'
import { isValidCategory, isValidDifficulty } from '../../supabase/functions/_shared/validation.ts'

describe('playable categories', () => {
  it('rejects a category that is not in the allow-list', () => {
    expect(isValidCategory('not_a_category')).toBe(false)
    expect(isValidCategory(null)).toBe(false)
    expect(isValidCategory(123)).toBe(false)
  })

  it('accepts every listed category', () => {
    for (const category of CATEGORIES) {
      expect(isValidCategory(category)).toBe(true)
    }
  })

  // These are out of rotation while their banks are rebuilt. Each stays a
  // valid Category at the type level — historical rounds, scores and question
  // rows still carry it — but must not be selectable, or create-round will
  // happily build a round from questions migrations 20240068/20240069
  // deactivated.
  it.each(['nfl_football', 'roman_history', 'harry_potter'])(
    'does not offer %s while it is marked coming soon',
    (category) => {
      expect(CATEGORIES).not.toContain(category)
      expect(isValidCategory(category)).toBe(false)
    }
  )

  // Same shape one level down: 'boss' is in the Difficulty union but is not a
  // difficulty anything generates or serves.
  it('does not offer boss as a selectable difficulty', () => {
    expect(DIFFICULTIES).not.toContain('boss')
    expect(isValidDifficulty('boss')).toBe(false)
  })

  it('has no duplicate entries', () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length)
  })
})
