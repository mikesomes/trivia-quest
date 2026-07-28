// Pure eligibility check for the "one more round" momentum bonus — no
// imports, so it's unit-testable directly (see __tests__/unit/momentum.test.ts).

/**
 * True when `completedAt` (the prior round's completion timestamp) is within
 * `windowMs` of `nowMs`. Guards against a future/clock-skewed timestamp too.
 */
export function isMomentumEligible(
  completedAt: string | null,
  windowMs: number,
  nowMs: number = Date.now(),
): boolean {
  if (!completedAt) return false
  const completedMs = new Date(completedAt).getTime()
  if (Number.isNaN(completedMs)) return false
  if (nowMs < completedMs) return false
  return nowMs - completedMs <= windowMs
}
