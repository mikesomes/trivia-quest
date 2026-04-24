import { getSurvivalMix, getNormalRoundMix, getClassicProgressionMix, getBlitzSegments, dominantDifficulty } from '../../src/utils/difficultyMix'

describe('getSurvivalMix', () => {
  it('returns correct mixes for each batch at count=10', () => {
    expect(getSurvivalMix(0, 10)).toEqual({ easy: 8, medium: 2, hard: 0 })
    expect(getSurvivalMix(1, 10)).toEqual({ easy: 6, medium: 3, hard: 1 })
    expect(getSurvivalMix(2, 10)).toEqual({ easy: 4, medium: 4, hard: 2 })
    expect(getSurvivalMix(3, 10)).toEqual({ easy: 2, medium: 5, hard: 3 })
    expect(getSurvivalMix(4, 10)).toEqual({ easy: 1, medium: 4, hard: 5 })
    expect(getSurvivalMix(5, 10)).toEqual({ easy: 0, medium: 3, hard: 7 })
    expect(getSurvivalMix(6, 10)).toEqual({ easy: 0, medium: 2, hard: 8 })
  })

  it('clamps batch 7+ to the last curve entry', () => {
    expect(getSurvivalMix(7, 10)).toEqual({ easy: 0, medium: 2, hard: 8 })
    expect(getSurvivalMix(100, 10)).toEqual({ easy: 0, medium: 2, hard: 8 })
  })

  it('sums always equal the requested count', () => {
    for (let batch = 0; batch <= 6; batch++) {
      const mix = getSurvivalMix(batch, 10)
      expect(mix.easy + mix.medium + mix.hard).toBe(10)
    }
  })

  it('scales to count=30 (blitz) with correct sums', () => {
    for (let batch = 0; batch <= 6; batch++) {
      const mix = getSurvivalMix(batch, 30)
      expect(mix.easy + mix.medium + mix.hard).toBe(30)
      expect(mix.easy).toBeGreaterThanOrEqual(0)
      expect(mix.medium).toBeGreaterThanOrEqual(0)
      expect(mix.hard).toBeGreaterThanOrEqual(0)
    }
  })

  it('all values are non-negative integers', () => {
    for (let batch = 0; batch <= 6; batch++) {
      const mix = getSurvivalMix(batch, 10)
      expect(Number.isInteger(mix.easy)).toBe(true)
      expect(Number.isInteger(mix.medium)).toBe(true)
      expect(Number.isInteger(mix.hard)).toBe(true)
      expect(mix.easy).toBeGreaterThanOrEqual(0)
      expect(mix.medium).toBeGreaterThanOrEqual(0)
      expect(mix.hard).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('getNormalRoundMix', () => {
  it('returns correct mixes for each difficulty at count=10', () => {
    expect(getNormalRoundMix('easy',   10)).toEqual({ easy: 7, medium: 3, hard: 0 })
    expect(getNormalRoundMix('medium', 10)).toEqual({ easy: 2, medium: 6, hard: 2 })
    expect(getNormalRoundMix('hard',   10)).toEqual({ easy: 0, medium: 3, hard: 7 })
  })

  it('sums equal count for count=10', () => {
    expect(getNormalRoundMix('easy',   10).easy + getNormalRoundMix('easy',   10).medium + getNormalRoundMix('easy',   10).hard).toBe(10)
    expect(getNormalRoundMix('medium', 10).easy + getNormalRoundMix('medium', 10).medium + getNormalRoundMix('medium', 10).hard).toBe(10)
    expect(getNormalRoundMix('hard',   10).easy + getNormalRoundMix('hard',   10).medium + getNormalRoundMix('hard',   10).hard).toBe(10)
  })

  it('sums equal 30 for blitz', () => {
    const easy   = getNormalRoundMix('easy',   30)
    const medium = getNormalRoundMix('medium', 30)
    const hard   = getNormalRoundMix('hard',   30)
    expect(easy.easy + easy.medium + easy.hard).toBe(30)
    expect(medium.easy + medium.medium + medium.hard).toBe(30)
    expect(hard.easy + hard.medium + hard.hard).toBe(30)
  })

  it('easy mix has more easy than hard questions', () => {
    const mix = getNormalRoundMix('easy', 10)
    expect(mix.easy).toBeGreaterThan(mix.hard)
  })

  it('hard mix has more hard than easy questions', () => {
    const mix = getNormalRoundMix('hard', 10)
    expect(mix.hard).toBeGreaterThan(mix.easy)
  })
})

describe('getBlitzSegments', () => {
  it('returns 3 segments at questionsPerSegment=10 with correct exact mixes', () => {
    const segs = getBlitzSegments(10)
    expect(segs).toHaveLength(3)
    expect(segs[0]).toEqual({ easy: 5, medium: 4, hard: 1 })
    expect(segs[1]).toEqual({ easy: 3, medium: 5, hard: 2 })
    expect(segs[2]).toEqual({ easy: 2, medium: 5, hard: 3 })
  })

  it('each segment sums to questionsPerSegment', () => {
    const segs = getBlitzSegments(10)
    for (const seg of segs) {
      expect(seg.easy + seg.medium + seg.hard).toBe(10)
    }
  })

  it('all values are non-negative integers', () => {
    const segs = getBlitzSegments(10)
    for (const seg of segs) {
      expect(Number.isInteger(seg.easy)).toBe(true)
      expect(Number.isInteger(seg.medium)).toBe(true)
      expect(Number.isInteger(seg.hard)).toBe(true)
      expect(seg.easy).toBeGreaterThanOrEqual(0)
      expect(seg.medium).toBeGreaterThanOrEqual(0)
      expect(seg.hard).toBeGreaterThanOrEqual(0)
    }
  })

  it('difficulty increases across segments (easy decreases, hard increases)', () => {
    const segs = getBlitzSegments(10)
    expect(segs[0].easy).toBeGreaterThan(segs[1].easy)
    expect(segs[1].easy).toBeGreaterThan(segs[2].easy)
    expect(segs[0].hard).toBeLessThan(segs[1].hard)
    expect(segs[1].hard).toBeLessThan(segs[2].hard)
  })
})

describe('getClassicProgressionMix', () => {
  it('returns correct mixes for each stage at count=10', () => {
    expect(getClassicProgressionMix(0, 10)).toEqual({ easy: 10, medium: 0, hard: 0 })
    expect(getClassicProgressionMix(1, 10)).toEqual({ easy: 7,  medium: 3, hard: 0 })
    expect(getClassicProgressionMix(2, 10)).toEqual({ easy: 4,  medium: 5, hard: 1 })
    expect(getClassicProgressionMix(3, 10)).toEqual({ easy: 1,  medium: 5, hard: 4 })
    expect(getClassicProgressionMix(4, 10)).toEqual({ easy: 0,  medium: 3, hard: 7 })
  })

  it('clamps index 5+ to stage 4', () => {
    expect(getClassicProgressionMix(5, 10)).toEqual({ easy: 0, medium: 3, hard: 7 })
    expect(getClassicProgressionMix(99, 10)).toEqual({ easy: 0, medium: 3, hard: 7 })
  })

  it('sums always equal the requested count', () => {
    for (let i = 0; i <= 5; i++) {
      const mix = getClassicProgressionMix(i, 10)
      expect(mix.easy + mix.medium + mix.hard).toBe(10)
    }
  })

  it('all values are non-negative integers', () => {
    for (let i = 0; i <= 4; i++) {
      const mix = getClassicProgressionMix(i, 10)
      expect(Number.isInteger(mix.easy)).toBe(true)
      expect(Number.isInteger(mix.medium)).toBe(true)
      expect(Number.isInteger(mix.hard)).toBe(true)
      expect(mix.easy).toBeGreaterThanOrEqual(0)
      expect(mix.medium).toBeGreaterThanOrEqual(0)
      expect(mix.hard).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('dominantDifficulty', () => {
  it('returns easy when easy has the most', () => {
    expect(dominantDifficulty({ easy: 8, medium: 2, hard: 0 })).toBe('easy')
  })

  it('returns medium when medium has the most', () => {
    expect(dominantDifficulty({ easy: 2, medium: 5, hard: 3 })).toBe('medium')
  })

  it('returns hard when hard has the most', () => {
    expect(dominantDifficulty({ easy: 0, medium: 3, hard: 7 })).toBe('hard')
  })

  it('prefers harder tier on a tie', () => {
    expect(dominantDifficulty({ easy: 5, medium: 5, hard: 0 })).toBe('medium')
    expect(dominantDifficulty({ easy: 0, medium: 5, hard: 5 })).toBe('hard')
  })
})
