import type { Category, Difficulty } from '../../functions/_shared/types.ts'
import { isValidCategory, isValidDifficulty } from '../../functions/_shared/validation.ts'

/** At most three buckets per run, so one run stays readable in the run log. */
export const MAX_TARGETS = 3

/**
 * The spend cap. Nothing else bounds how many questions a scheduled run
 * generates, so every count check below funnels through this number.
 */
export const MAX_CANDIDATES_PER_RUN = 5

export interface PipelineTarget {
  category: Category
  difficulty: Difficulty
  count: number
}

export function parseTargets(value: unknown): PipelineTarget[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_TARGETS) {
    throw new Error(`targets must contain between 1 and ${MAX_TARGETS} category/difficulty targets`)
  }

  const seen = new Set<string>()
  const targets = value.map((entry): PipelineTarget => {
    if (!entry || typeof entry !== 'object') throw new Error('Each target must be an object')
    const { category, difficulty, count } = entry as Record<string, unknown>
    if (!isValidCategory(category) || !isValidDifficulty(difficulty)) {
      throw new Error('Each target must use a valid category and difficulty')
    }
    if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > MAX_CANDIDATES_PER_RUN) {
      throw new Error(`Each target count must be between 1 and ${MAX_CANDIDATES_PER_RUN}`)
    }
    const key = `${category}:${difficulty}`
    if (seen.has(key)) throw new Error('Targets may not repeat a category/difficulty bucket')
    seen.add(key)
    return { category, difficulty, count: count as number }
  })

  if (targets.reduce((total, target) => total + target.count, 0) > MAX_CANDIDATES_PER_RUN) {
    throw new Error(`A run may stage at most ${MAX_CANDIDATES_PER_RUN} candidates`)
  }
  return targets
}

/**
 * Parses the AI_PIPELINE_TARGETS environment value. Widening coverage is meant
 * to be a deliberate configuration change, so a missing or malformed value
 * fails the run rather than falling back to some default set of buckets.
 */
export function parsePipelineTargets(raw: string | undefined): PipelineTarget[] {
  if (!raw) throw new Error('Missing AI_PIPELINE_TARGETS')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('AI_PIPELINE_TARGETS must be valid JSON')
  }
  return parseTargets(parsed)
}
