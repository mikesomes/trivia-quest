import { describe, it, expect } from 'vitest'

const TIMER_SECONDS = 15
const BLITZ_SECONDS = 45
const MAX_PLAYER_LEVEL = 50
const EASY_BASE_ANSWER_XP = 10
const XP_BASE_BY_DIFFICULTY: Record<string, number> = { easy: 10, medium: 15, hard: 25, boss: 40 }

type ScoringTimerMode = 'question' | 'round'

function getScoringTimerDurationMs(mode: ScoringTimerMode) {
  return (mode === 'round' ? BLITZ_SECONDS : TIMER_SECONDS) * 1000
}

function createActiveScoringTimerSnapshot(params: {
  mode: ScoringTimerMode
  remainingMs?: number
  elapsedMs?: number
}) {
  const durationMs = getScoringTimerDurationMs(params.mode)
  const remainingMs = Math.max(
    0,
    Math.min(durationMs, Math.floor(params.remainingMs ?? durationMs - (params.elapsedMs ?? durationMs)))
  )

  return {
    mode: params.mode,
    durationMs,
    elapsedMs: durationMs - remainingMs,
    remainingMs,
  }
}

function computeAnswerXp(params: {
  isCorrect: boolean
  activeTimer: ReturnType<typeof createActiveScoringTimerSnapshot>
  currentStreak: number
  difficulty: string
}) {
  const timing = createActiveScoringTimerSnapshot(params.activeTimer)

  if (!params.isCorrect) {
    return {
      base: 0,
      timeBonus: 0,
      difficultyBonus: 0,
      streakBonus: 0,
      difficultyMultiplier: 1.0,
      comboMultiplier: 1.0,
      total: 0,
      newStreak: 0,
      timing,
    }
  }

  const difficultyBase = XP_BASE_BY_DIFFICULTY[params.difficulty] ?? XP_BASE_BY_DIFFICULTY.medium
  const timeBonus = Math.floor(difficultyBase * 0.5 * (timing.remainingMs / timing.durationMs))
  const newStreak = params.currentStreak + 1
  const comboMultiplier = newStreak >= 10 ? 2.0 : newStreak >= 8 ? 1.5 : newStreak >= 5 ? 1.25 : newStreak >= 3 ? 1.1 : 1.0
  const difficultyMultiplier = difficultyBase / EASY_BASE_ANSWER_XP
  const difficultyBonus = Math.max(0, difficultyBase - EASY_BASE_ANSWER_XP)
  const beforeStreak = EASY_BASE_ANSWER_XP + difficultyBonus + timeBonus
  const total = Math.floor(beforeStreak * comboMultiplier)
  const streakBonus = Math.max(0, total - beforeStreak)

  return {
    base: EASY_BASE_ANSWER_XP,
    timeBonus,
    difficultyBonus,
    streakBonus,
    difficultyMultiplier,
    comboMultiplier,
    total,
    newStreak,
    timing,
  }
}

function computeXpEarned(correctCount: number, difficulty: string, totalQuestions: number) {
  const multipliers: Record<string, number> = { easy: 1.0, medium: 1.5, hard: 2.0 }
  const isPerfect = correctCount === totalQuestions
  const base = correctCount * 10 + 50 + (isPerfect ? 100 : 0)
  return Math.floor(base * (multipliers[difficulty] ?? 1.0))
}

function levelFromXp(totalXp: number) {
  const xpForNextLevel = (level: number): number => Math.floor(75 + level * 45 + Math.pow(level, 1.65) * 18)
  const xpRequired = (n: number): number => {
    if (n <= 1) return 0
    const targetLevel = Math.min(n, MAX_PLAYER_LEVEL)
    let total = 0
    for (let i = 1; i < targetLevel; i++) total += xpForNextLevel(i)
    return total
  }
  let level = 1
  while (level < MAX_PLAYER_LEVEL && xpRequired(level + 1) <= totalXp) {
    level++
  }
  return level
}

describe('computeAnswerXp', () => {
  it('returns 0 XP for an incorrect answer', () => {
    expect(computeAnswerXp({
      isCorrect: false,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'question', elapsedMs: 5000 }),
      currentStreak: 4,
      difficulty: 'hard',
    }).total).toBe(0)
  })

  it('preserves classic question-timer scoring', () => {
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
    expect(easy.timing.mode).toBe('question')
  })

  it('uses round countdown remaining time for blitz scoring', () => {
    const fastBlitz = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'round', remainingMs: 45000 }),
      currentStreak: 0,
      difficulty: 'medium',
    })
    const lateBlitz = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'round', remainingMs: 5000 }),
      currentStreak: 0,
      difficulty: 'medium',
    })

    expect(fastBlitz.timeBonus).toBe(7)
    expect(lateBlitz.timeBonus).toBe(0)
    expect(fastBlitz.total).toBeGreaterThan(lateBlitz.total)
    expect(fastBlitz.timing.mode).toBe('round')
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

  it('applies no speed bonus when the active timer is empty', () => {
    const zeroTime = computeAnswerXp({
      isCorrect: true,
      activeTimer: createActiveScoringTimerSnapshot({ mode: 'round', remainingMs: 0 }),
      currentStreak: 0,
      difficulty: 'hard',
    })

    expect(zeroTime.timeBonus).toBe(0)
    expect(zeroTime.total).toBe(EASY_BASE_ANSWER_XP + 15)
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

describe('computeXpEarned', () => {
  it('awards completion bonus for any finished round', () => {
    const xp = computeXpEarned(0, 'easy', 10)
    expect(xp).toBe(50)
  })

  it('applies difficulty multiplier', () => {
    const easy = computeXpEarned(5, 'easy', 10)
    const hard = computeXpEarned(5, 'hard', 10)
    expect(hard).toBe(easy * 2)
  })

  it('awards perfect round bonus', () => {
    const normal = computeXpEarned(9, 'easy', 10)
    const perfect = computeXpEarned(10, 'easy', 10)
    expect(perfect - normal).toBe(110)
  })
})

describe('levelFromXp', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(levelFromXp(0)).toBe(1)
  })

  it('reaches level 2 at 138 XP', () => {
    expect(levelFromXp(138)).toBe(2)
    expect(levelFromXp(137)).toBe(1)
  })

  it('reaches level 3 at 359 XP', () => {
    expect(levelFromXp(359)).toBe(3)
    expect(levelFromXp(358)).toBe(2)
  })

  it('caps at level 50', () => {
    expect(levelFromXp(9999999)).toBe(50)
  })
})
