import {
  computeAnswerXp,
  computeXpEarned,
  createActiveScoringTimerSnapshot,
  levelFromXp,
  xpRequiredForLevel,
  MAX_PLAYER_LEVEL,
} from '../../src/utils/scoring'

describe('computeXpEarned', () => {
  it('scales with difficulty', () => {
    const easy = computeXpEarned(5, 'easy', 10)
    const hard = computeXpEarned(5, 'hard', 10)
    expect(hard).toBe(easy * 2)
  })

  it('adds perfect bonus', () => {
    const notPerfect = computeXpEarned(9, 'easy', 10)
    const perfect = computeXpEarned(10, 'easy', 10)
    expect(perfect > notPerfect).toBe(true)
  })
})

describe('computeAnswerXp', () => {
  it('returns 0 XP for an incorrect answer', () => {
    expect(computeAnswerXp({
      isCorrect: false,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'question', elapsedMs: 5000 }),
      currentStreak: 4,
      difficulty: 'hard',
    }).total).toBe(0)
  })

  it('preserves classic question timer scoring', () => {
    const easy = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'question', elapsedMs: 0 }),
      currentStreak: 0,
      difficulty: 'easy',
    })
    const hard = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'question', elapsedMs: 0 }),
      currentStreak: 0,
      difficulty: 'hard',
    })

    expect(easy.timeBonus).toBe(5)
    expect(easy.total).toBe(15)
    expect(hard.timeBonus).toBe(12)
    expect(hard.total).toBeGreaterThan(easy.total)
    expect(hard.difficultyBonus).toBeGreaterThan(0)
  })

  it('uses round countdown remaining time for blitz scoring', () => {
    const early = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'round', remainingMs: 45000 }),
      currentStreak: 0,
      difficulty: 'medium',
    })
    const late = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'round', remainingMs: 5000 }),
      currentStreak: 0,
      difficulty: 'medium',
    })

    expect(early.timeBonus).toBe(7)
    expect(late.timeBonus).toBe(0)
    expect(early.total).toBeGreaterThan(late.total)
    expect(early.timing.mode).toBe('round')
  })

  it('maps timer remaining time into the speed bonus curve', () => {
    const mediumHalfTime = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'question', remainingMs: 7500 }),
      currentStreak: 0,
      difficulty: 'medium',
    })

    expect(mediumHalfTime.timeBonus).toBe(3)
  })

  it('applies no speed bonus at zero remaining time', () => {
    const zeroTime = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'round', remainingMs: 0 }),
      currentStreak: 0,
      difficulty: 'hard',
    })

    expect(zeroTime.timeBonus).toBe(0)
    expect(zeroTime.total).toBe(25)
  })

  it('multiplies XP when the streak reaches 3', () => {
    const noStreak = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'question', elapsedMs: 5000 }),
      currentStreak: 1,
      difficulty: 'medium',
    })
    const streak = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'question', elapsedMs: 5000 }),
      currentStreak: 2,
      difficulty: 'medium',
    })

    expect(streak.comboMultiplier).toBeGreaterThan(noStreak.comboMultiplier)
    expect(streak.streakBonus).toBe(2)
    expect(streak.total).toBeGreaterThan(noStreak.total)
  })
})

describe('levelFromXp', () => {
  it('starts at level 1', () => {
    expect(levelFromXp(0)).toBe(1)
  })

  it('reaches level 2 at 138 XP', () => {
    expect(levelFromXp(138)).toBe(2)
    expect(levelFromXp(137)).toBe(1)
  })

  it('caps at the current max level', () => {
    expect(levelFromXp(xpRequiredForLevel(MAX_PLAYER_LEVEL + 1) + 100000)).toBe(MAX_PLAYER_LEVEL)
  })
})
