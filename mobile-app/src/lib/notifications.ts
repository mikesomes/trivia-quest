import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// All local notifications use fixed identifiers so re-scheduling is idempotent:
// scheduling with the same identifier replaces the previous instance.
const EVENING_STREAK_REMINDER_ID = 'evening-streak-reminder'
const MORNING_CHALLENGE_ID = 'morning-challenge-nudge'
const INACTIVITY_LADDER: { id: string; days: number; title: string; body: string }[] = [
  {
    id: 'inactivity-2d',
    days: 2,
    title: 'Your brain misses you 🧠',
    body: "A fresh Daily Challenge is waiting. Two minutes — that's all it takes.",
  },
  {
    id: 'inactivity-5d',
    days: 5,
    title: 'The leaderboard moved on 👀',
    body: 'Players are passing you while you’re away. Jump back in and reclaim your rank.',
  },
  {
    id: 'inactivity-12d',
    days: 12,
    title: 'One round. For old times’ sake ✨',
    body: 'Today’s challenge is waiting — same 10 questions for everyone. Start a new streak tonight.',
  },
]

const PERMISSION_ASKED_KEY = 'notifications:permission-asked'

const EVENING_REMINDER_HOUR = 19 // 7pm local
const MORNING_NUDGE_HOUR = 9
const MORNING_NUDGE_MINUTE = 30

/** Call once at app startup (root layout). */
export function initNotifications() {
  // Local reminders are pointless while the app is open — stay silent in foreground.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {})
  }
}

async function hasPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync()
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
}

/**
 * Ask for notification permission once, at a moment of goodwill (after a win) —
 * never at cold start. Returns true if permission is granted.
 */
export async function maybeAskForPermission(): Promise<boolean> {
  if (await hasPermission()) return true
  const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY)
  if (asked) return false
  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, '1')
  const result = await Notifications.requestPermissionsAsync()
  return result.granted
}

/**
 * Reschedule daily reminders from current state. Safe to call often (idempotent);
 * called when daily-challenge status loads and after completion.
 */
export async function syncDailyReminders(opts: {
  challengeCompletedToday: boolean
  dayStreak: number
}): Promise<void> {
  if (!(await hasPermission())) return

  // Morning nudge: repeating daily — tomorrow always has a new challenge.
  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_CHALLENGE_ID,
    content: {
      title: 'Today’s Daily Challenge is live 🌅',
      body: 'Same 10 questions for everyone. Set the bar early.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: MORNING_NUDGE_HOUR,
      minute: MORNING_NUDGE_MINUTE,
    },
  })

  // Evening streak-saver: one-shot for today only, canceled once completed.
  await Notifications.cancelScheduledNotificationAsync(EVENING_STREAK_REMINDER_ID).catch(() => {})
  if (!opts.challengeCompletedToday) {
    const fireAt = new Date()
    fireAt.setHours(EVENING_REMINDER_HOUR, 0, 0, 0)
    if (fireAt.getTime() > Date.now()) {
      const { title, body } =
        opts.dayStreak > 0
          ? {
              title: `Your ${opts.dayStreak}-day streak is at risk 🔥`,
              body: 'Finish today’s Daily Challenge before midnight to keep it alive.',
            }
          : {
              title: 'Tonight’s Daily Challenge expires at midnight ⏳',
              body: 'Ten questions, one shot per day. Start a streak tonight.',
            }
      await Notifications.scheduleNotificationAsync({
        identifier: EVENING_STREAK_REMINDER_ID,
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      })
    }
  }
}

/** Cancel today's streak-saver the moment the challenge is completed. */
export async function cancelStreakReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(EVENING_STREAK_REMINDER_ID).catch(() => {})
}

/**
 * Re-arm the inactivity ladder. Called on every app foreground, so these only
 * ever fire after genuinely N days away.
 */
export async function rescheduleInactivityLadder(): Promise<void> {
  if (!(await hasPermission())) return
  for (const step of INACTIVITY_LADDER) {
    await Notifications.scheduleNotificationAsync({
      identifier: step.id,
      content: { title: step.title, body: step.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: step.days * 24 * 60 * 60,
        repeats: false,
      },
    })
  }
}
