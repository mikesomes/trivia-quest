import type { Challenge } from '../api/challenges'

const LEVEL_NUDGE_THRESHOLD_XP = 150

// "rounds_completed"-style challenges (daily_rounds_3, weekly_rounds_10) have
// small targets — 1 remaining reads as "almost done". "correct_answers"-style
// challenges (daily_correct_25, weekly_correct_100) have larger targets, so
// "almost done" means within about one round's worth of correct answers.
function almostDoneThreshold(challengeId: string): number {
  return challengeId.includes('rounds') ? 1 : 10
}

export function pickAlmostDoneChallenge(challenges: Challenge[]): Challenge | null {
  let best: { challenge: Challenge; remaining: number } | null = null

  for (const c of challenges) {
    if (c.isComplete) continue
    const remaining = c.target - c.progress
    if (remaining <= 0 || remaining > almostDoneThreshold(c.id)) continue
    if (!best || remaining < best.remaining) best = { challenge: c, remaining }
  }

  return best?.challenge ?? null
}

/**
 * Picks a single "just one more step" nudge for the results screen: how close
 * the player is to leveling up, falling back to the nearest-to-complete
 * challenge. Returns null when nothing is close enough to be worth surfacing.
 */
export function formatNextStepNudge(params: {
  xpToNextLevel?: number
  newLevel?: number
  challenges: Challenge[]
}): string | null {
  if (
    typeof params.xpToNextLevel === 'number' &&
    typeof params.newLevel === 'number' &&
    params.xpToNextLevel > 0 &&
    params.xpToNextLevel <= LEVEL_NUDGE_THRESHOLD_XP
  ) {
    return `⚡ ${params.xpToNextLevel} XP from Level ${params.newLevel + 1}`
  }

  const challenge = pickAlmostDoneChallenge(params.challenges)
  if (challenge) {
    const remaining = challenge.target - challenge.progress
    return `🎯 ${remaining} more to complete "${challenge.label}"`
  }

  return null
}
