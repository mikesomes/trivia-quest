import type { createServiceClient } from './supabaseClient.ts'
import { computeStreakUpdate } from './streakLogic.ts'

export interface DayStreakResult {
  currentStreak: number
  longestStreak: number
  streakFreezes: number
  /** True when this call moved the streak forward (first activity of the day). */
  extendedToday: boolean
  freezesUsed: number
}

/** Current date in America/New_York (YYYY-MM-DD). DST-safe via IANA tz. */
export function getEasternDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

/**
 * Record activity for today and advance the user's day streak.
 * Idempotent per Eastern calendar day. Fire-and-forget safe — returns null on
 * any database error.
 */
export async function updateDayStreak(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<DayStreakResult | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('current_streak, longest_streak, last_active_date, streak_freezes')
    .eq('id', userId)
    .single()

  if (error || !user) return null

  const today = getEasternDate()
  const update = computeStreakUpdate(
    {
      currentStreak: user.current_streak ?? 0,
      longestStreak: user.longest_streak ?? 0,
      streakFreezes: user.streak_freezes ?? 0,
      lastActiveDate: user.last_active_date,
    },
    today,
  )

  if (update.changed) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        current_streak: update.currentStreak,
        longest_streak: update.longestStreak,
        last_active_date: today,
        streak_freezes: update.streakFreezes,
      })
      .eq('id', userId)

    if (updateError) return null
  }

  return {
    currentStreak: update.currentStreak,
    longestStreak: update.longestStreak,
    streakFreezes: update.streakFreezes,
    extendedToday: update.changed,
    freezesUsed: update.freezesUsed,
  }
}
