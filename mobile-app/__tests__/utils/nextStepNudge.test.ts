import { pickAlmostDoneChallenge, formatNextStepNudge } from '../../src/utils/nextStepNudge'
import type { Challenge } from '../../src/api/challenges'

function challenge(overrides: Partial<Challenge>): Challenge {
  return {
    id: 'daily_correct_25',
    period: 'daily',
    label: 'Answer 25 questions correctly',
    // The API still sends an emoji per challenge; the app ignores it and draws
    // its own mark. Kept here so the fixture matches the real payload shape.
    emoji: '🎯',
    target: 25,
    xpReward: 200,
    progress: 0,
    isComplete: false,
    periodStart: '2026-07-26',
    ...overrides,
  }
}

describe('pickAlmostDoneChallenge', () => {
  it('ignores completed challenges', () => {
    const result = pickAlmostDoneChallenge([challenge({ isComplete: true, progress: 25 })])
    expect(result).toBeNull()
  })

  it('ignores challenges that are not close (correct_answers: >10 remaining)', () => {
    const result = pickAlmostDoneChallenge([challenge({ progress: 5 })]) // 20 remaining
    expect(result).toBeNull()
  })

  it('surfaces a correct_answers challenge within 10 remaining', () => {
    const result = pickAlmostDoneChallenge([challenge({ progress: 18 })]) // 7 remaining
    expect(result?.id).toBe('daily_correct_25')
  })

  it('treats rounds_completed challenges as almost-done only at 1 remaining', () => {
    const twoLeft = challenge({ id: 'daily_rounds_3', target: 3, progress: 1 }) // 2 remaining
    const oneLeft = challenge({ id: 'daily_rounds_3', target: 3, progress: 2 }) // 1 remaining
    expect(pickAlmostDoneChallenge([twoLeft])).toBeNull()
    expect(pickAlmostDoneChallenge([oneLeft])?.id).toBe('daily_rounds_3')
  })

  it('picks the closest-to-complete challenge among several candidates', () => {
    const far = challenge({ id: 'daily_correct_25', progress: 18 }) // 7 remaining
    const near = challenge({ id: 'weekly_rounds_10', target: 10, progress: 9 }) // 1 remaining
    const result = pickAlmostDoneChallenge([far, near])
    expect(result?.id).toBe('weekly_rounds_10')
  })
})

describe('formatNextStepNudge', () => {
  it('prioritizes an imminent level-up over a challenge', () => {
    const nudge = formatNextStepNudge({
      xpToNextLevel: 40,
      newLevel: 11,
      challenges: [challenge({ progress: 18 })],
    })
    expect(nudge).toEqual({ icon: 'xp', text: '40 XP from Level 12' })
  })

  it('falls back to an almost-done challenge when the level is far off', () => {
    const nudge = formatNextStepNudge({
      xpToNextLevel: 5000,
      newLevel: 11,
      challenges: [challenge({ progress: 18 })],
    })
    expect(nudge?.icon).toBe('target')
    expect(nudge?.text).toContain('Answer 25 questions correctly')
  })

  it('returns null when nothing is close', () => {
    const nudge = formatNextStepNudge({
      xpToNextLevel: 5000,
      newLevel: 11,
      challenges: [challenge({ progress: 2 })],
    })
    expect(nudge).toBeNull()
  })

  it('returns null with no xp data and no challenges', () => {
    expect(formatNextStepNudge({ challenges: [] })).toBeNull()
  })
})
