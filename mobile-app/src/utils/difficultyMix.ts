import type { Difficulty } from '../types/game'

export type DifficultyMix = { easy: number; medium: number; hard: number }

const SURVIVAL_CURVE: DifficultyMix[] = [
  { easy: 8, medium: 2, hard: 0 }, // batch 0
  { easy: 6, medium: 3, hard: 1 }, // batch 1
  { easy: 4, medium: 4, hard: 2 }, // batch 2
  { easy: 2, medium: 5, hard: 3 }, // batch 3
  { easy: 1, medium: 4, hard: 5 }, // batch 4
  { easy: 0, medium: 3, hard: 7 }, // batch 5
  { easy: 0, medium: 2, hard: 8 }, // batch 6
  { easy: 0, medium: 1, hard: 9 }, // batch 7
  { easy: 0, medium: 0, hard: 10 }, // batch 8+
]

const NORMAL_ROUND_MIXES: Record<Difficulty, DifficultyMix> = {
  easy:   { easy: 7, medium: 3, hard: 0 },
  medium: { easy: 2, medium: 6, hard: 2 },
  hard:   { easy: 0, medium: 3, hard: 7 },
}

// Scale a base-10 mix to an arbitrary count using largest-remainder rounding
// so the sum always equals count exactly.
function scaleMix(base: DifficultyMix, count: number): DifficultyMix {
  const total = base.easy + base.medium + base.hard
  if (total === 0) return { easy: 0, medium: 0, hard: 0 }

  const rawEasy   = (base.easy   / total) * count
  const rawMedium = (base.medium / total) * count
  const rawHard   = (base.hard   / total) * count

  const result: DifficultyMix = {
    easy:   Math.floor(rawEasy),
    medium: Math.floor(rawMedium),
    hard:   Math.floor(rawHard),
  }

  const remainder = count - result.easy - result.medium - result.hard
  const fracs = [
    { key: 'easy'   as const, frac: rawEasy   - result.easy },
    { key: 'medium' as const, frac: rawMedium - result.medium },
    { key: 'hard'   as const, frac: rawHard   - result.hard },
  ].sort((a, b) => b.frac - a.frac)

  for (let i = 0; i < remainder; i++) result[fracs[i].key]++
  return result
}

export function getSurvivalMix(batchNumber: number, count: number): DifficultyMix {
  const base = SURVIVAL_CURVE[Math.min(batchNumber, SURVIVAL_CURVE.length - 1)]
  return scaleMix(base, count)
}

export function getNormalRoundMix(chosen: Difficulty, count: number): DifficultyMix {
  const base = NORMAL_ROUND_MIXES[chosen]
  return scaleMix(base, count)
}

const BLITZ_SEGMENTS: DifficultyMix[] = [
  { easy: 45, medium: 45, hard: 10 }, // first third
  { easy: 30, medium: 50, hard: 20 }, // middle third
  { easy: 20, medium: 45, hard: 35 }, // final third
]

export function getBlitzSegments(questionsPerSegment: number): DifficultyMix[] {
  return BLITZ_SEGMENTS.map(base => scaleMix(base, questionsPerSegment))
}

const CLASSIC_PROGRESSION: DifficultyMix[] = [
  { easy: 10, medium: 0, hard: 0 }, // round 1
  { easy: 7,  medium: 3, hard: 0 }, // round 2
  { easy: 4,  medium: 5, hard: 1 }, // round 3
  { easy: 1,  medium: 5, hard: 4 }, // round 4
  { easy: 0,  medium: 3, hard: 7 }, // round 5+ (capped)
]

export function getClassicProgressionMix(roundIndex: number, count: number): DifficultyMix {
  const base = CLASSIC_PROGRESSION[Math.min(roundIndex, CLASSIC_PROGRESSION.length - 1)]
  return scaleMix(base, count)
}

// Returns the difficulty bucket with the most questions; used to label the round.
// On a tie, prefers the harder tier.
export function dominantDifficulty(mix: DifficultyMix): Difficulty {
  if (mix.hard >= mix.medium && mix.hard >= mix.easy) return 'hard'
  if (mix.medium >= mix.easy) return 'medium'
  return 'easy'
}
