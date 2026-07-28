// Pure day-streak decision logic — no imports, so Node-based unit tests can
// exercise the exact code the edge functions run (see __tests__/unit/streaks.test.ts).

export interface StreakState {
  currentStreak: number
  longestStreak: number
  streakFreezes: number
  lastActiveDate: string | null
}

export interface StreakUpdate {
  currentStreak: number
  longestStreak: number
  streakFreezes: number
  freezesUsed: number
  /** False when the streak already advanced today (no write needed). */
  changed: boolean
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split('-').map(Number)
  const [ty, tm, td] = toYmd.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

/**
 * Advance a day streak for activity on `today` (YYYY-MM-DD, Eastern).
 * A gap of N missed days is bridged by consuming N freezes when available;
 * otherwise the streak resets to 1.
 */
export function computeStreakUpdate(state: StreakState, today: string): StreakUpdate {
  const { currentStreak, longestStreak, streakFreezes, lastActiveDate } = state

  if (lastActiveDate === today) {
    return {
      currentStreak,
      longestStreak,
      streakFreezes,
      freezesUsed: 0,
      changed: false,
    }
  }

  let newStreak: number
  let freezesUsed = 0

  if (!lastActiveDate) {
    newStreak = 1
  } else {
    const missedDays = daysBetween(lastActiveDate, today) - 1
    if (missedDays <= 0) {
      newStreak = currentStreak + 1
    } else if (streakFreezes >= missedDays) {
      freezesUsed = missedDays
      newStreak = currentStreak + 1
    } else {
      newStreak = 1
    }
  }

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(longestStreak, newStreak),
    streakFreezes: streakFreezes - freezesUsed,
    freezesUsed,
    changed: true,
  }
}
