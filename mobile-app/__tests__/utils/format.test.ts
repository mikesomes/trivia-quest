import { formatAccuracy, formatLevel, formatNumber, formatXp, pluralize } from '../../src/utils/format'

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
