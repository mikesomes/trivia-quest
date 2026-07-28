import { describe, it, expect } from 'vitest'
// Imports the actual production module (it is dependency-free), unlike the
// mirror-style tests elsewhere in this suite.
import { computeStreakUpdate, daysBetween } from '../../supabase/functions/_shared/streakLogic'

const base = { currentStreak: 5, longestStreak: 8, streakFreezes: 0, lastActiveDate: '2026-07-25' }

describe('daysBetween', () => {
  it('computes calendar-day gaps', () => {
    expect(daysBetween('2026-07-25', '2026-07-26')).toBe(1)
    expect(daysBetween('2026-07-25', '2026-07-25')).toBe(0)
    expect(daysBetween('2026-06-30', '2026-07-02')).toBe(2)
  })

  it('spans month and year boundaries', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1) // 2026 is not a leap year
  })
})

describe('computeStreakUpdate', () => {
  it('starts a streak on first-ever activity', () => {
    const r = computeStreakUpdate({ ...base, currentStreak: 0, longestStreak: 0, lastActiveDate: null }, '2026-07-26')
    expect(r).toMatchObject({ currentStreak: 1, longestStreak: 1, freezesUsed: 0, changed: true })
  })

  it('is idempotent within the same day', () => {
    const r = computeStreakUpdate({ ...base, lastActiveDate: '2026-07-26' }, '2026-07-26')
    expect(r).toMatchObject({ currentStreak: 5, longestStreak: 8, changed: false })
  })

  it('extends the streak on consecutive days', () => {
    const r = computeStreakUpdate(base, '2026-07-26')
    expect(r).toMatchObject({ currentStreak: 6, longestStreak: 8, freezesUsed: 0, changed: true })
  })

  it('updates the longest streak when passed', () => {
    const r = computeStreakUpdate({ ...base, currentStreak: 8 }, '2026-07-26')
    expect(r).toMatchObject({ currentStreak: 9, longestStreak: 9 })
  })

  it('resets after a missed day with no freezes', () => {
    const r = computeStreakUpdate(base, '2026-07-27')
    expect(r).toMatchObject({ currentStreak: 1, longestStreak: 8, freezesUsed: 0, changed: true })
  })

  it('consumes one freeze to bridge one missed day', () => {
    const r = computeStreakUpdate({ ...base, streakFreezes: 2 }, '2026-07-27')
    expect(r).toMatchObject({ currentStreak: 6, streakFreezes: 1, freezesUsed: 1 })
  })

  it('consumes multiple freezes for a multi-day gap', () => {
    const r = computeStreakUpdate({ ...base, streakFreezes: 2 }, '2026-07-28')
    expect(r).toMatchObject({ currentStreak: 6, streakFreezes: 0, freezesUsed: 2 })
  })

  it('resets when freezes cannot cover the whole gap', () => {
    const r = computeStreakUpdate({ ...base, streakFreezes: 1 }, '2026-07-28')
    expect(r).toMatchObject({ currentStreak: 1, streakFreezes: 1, freezesUsed: 0 })
  })
})
