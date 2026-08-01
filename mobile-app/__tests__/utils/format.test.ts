import {
  formatAccuracy,
  formatCompactDuration,
  formatLevel,
  formatNumber,
  formatXp,
  pluralize,
} from '../../src/utils/format'

describe('format utils', () => {
  it('formats missing numbers as zero instead of throwing', () => {
    expect(formatNumber(undefined)).toBe('0')
    expect(formatNumber(null)).toBe('0')
  })

  it('formats derived numeric strings safely', () => {
    expect(formatAccuracy(undefined)).toBe('0%')
    expect(formatLevel(undefined)).toBe('Lv.0')
    expect(formatXp(undefined)).toBe('0 XP')
    expect(pluralize(undefined, 'game')).toBe('0 games')
  })
})

describe('formatCompactDuration', () => {
  it('shows hours and minutes past the hour mark', () => {
    expect(formatCompactDuration(4 * 3600_000 + 12 * 60_000 + 55_000)).toBe('4h 12m')
    expect(formatCompactDuration(3600_000)).toBe('1h 0m')
  })

  it('drops to minutes alone under an hour', () => {
    expect(formatCompactDuration(12 * 60_000 + 30_000)).toBe('12m')
    expect(formatCompactDuration(60_000)).toBe('1m')
  })

  it('falls back to seconds in the last minute', () => {
    expect(formatCompactDuration(48_000)).toBe('48s')
    expect(formatCompactDuration(0)).toBe('0s')
  })

  it('floors a passed deadline at zero rather than counting backwards', () => {
    expect(formatCompactDuration(-5000)).toBe('0s')
    expect(formatCompactDuration(undefined)).toBe('0s')
  })
})
