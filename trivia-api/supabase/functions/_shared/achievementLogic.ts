// Pure achievement-threshold logic — no imports, so it's unit-testable
// directly under Node (see __tests__/unit/achievements.test.ts). Kept
// separate from achievements.ts because that file imports supabaseClient.ts,
// which only typechecks under Deno.

// Shared thresholds — the single source of truth for both award-checking
// (built inline per call site) and progress-bar display (get-achievements),
// so the two paths can never drift out of sync.
export const GAMES_TARGETS = [10, 50, 100] as const
export const STREAK_TARGETS = [5, 10, 15] as const
export const SURVIVAL_TARGETS = [10, 25, 50] as const
export const BLITZ_TARGETS = [15, 25, 35] as const
export const DAY_STREAK_TARGETS = [7, 30, 100] as const
export const CATEGORY_MASTERY_TARGET = 50

/** Builds `{ [prefix]_[target]: value >= target }` for each target in the tier list. */
export function thresholdConditions(
  prefix: string,
  targets: readonly number[],
  value: number,
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const target of targets) out[`${prefix}_${target}`] = value >= target
  return out
}
