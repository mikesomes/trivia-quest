import { describe, it, expect } from 'vitest'
import { isMomentumEligible } from '../../supabase/functions/_shared/momentum'

const WINDOW_MS = 2 * 60 * 1000
const NOW = new Date('2026-07-26T12:00:00.000Z').getTime()

describe('isMomentumEligible', () => {
  it('is eligible immediately after completion', () => {
    expect(isMomentumEligible('2026-07-26T12:00:00.000Z', WINDOW_MS, NOW)).toBe(true)
  })

  it('is eligible right up to the window boundary', () => {
    expect(isMomentumEligible('2026-07-26T11:58:00.000Z', WINDOW_MS, NOW)).toBe(true)
  })

  it('is not eligible just past the window', () => {
    expect(isMomentumEligible('2026-07-26T11:57:59.000Z', WINDOW_MS, NOW)).toBe(false)
  })

  it('is not eligible with no completion timestamp', () => {
    expect(isMomentumEligible(null, WINDOW_MS, NOW)).toBe(false)
  })

  it('is not eligible with a malformed timestamp', () => {
    expect(isMomentumEligible('not-a-date', WINDOW_MS, NOW)).toBe(false)
  })

  it('rejects a future/clock-skewed completion timestamp', () => {
    expect(isMomentumEligible('2026-07-26T12:05:00.000Z', WINDOW_MS, NOW)).toBe(false)
  })
})
