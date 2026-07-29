import PostHog from 'posthog-react-native'

/**
 * Single choke point for product analytics, the same shape as src/lib/haptics.ts.
 *
 * Every call site goes through the named helpers below rather than importing
 * PostHog, so the event vocabulary lives in one file and can be audited by
 * reading it. Swallows its own errors — analytics must never be able to break a
 * round.
 *
 * The first events are deliberately about content rather than the retention
 * funnel. The bank has ~11,500 questions with no measurement of which ones are
 * any good; correct rates and flag rates are already recorded server-side, but
 * nothing captures what a player actually experiences — a question repeating,
 * a category running dry mid-session.
 */

let client: PostHog | null = null

/** Mirrors the gate in src/lib/sentry.ts so dev sessions never pollute the data. */
function isEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ENV === 'production' && Boolean(process.env.EXPO_PUBLIC_POSTHOG_KEY)
}

export function initAnalytics() {
  if (client || !isEnabled()) return

  try {
    client = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY as string, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      // Rounds are bursty and often played on poor connections; batching keeps
      // the network off the answer path.
      flushAt: 20,
      flushInterval: 30_000,
    })
  } catch {
    client = null
  }
}

/**
 * Tie events to the Supabase user id.
 *
 * The same id is what Sentry should carry, so a crash and the session that led
 * to it can be lined up. Anonymous auth means this survives reinstall on iOS
 * via the Keychain refresh token but not a device change — a distinct id here
 * is a device-lifetime identity, not a person.
 */
export function identifyUser(userId: string | null) {
  if (!client || !userId) return
  try {
    client.identify(userId)
  } catch {}
}

function capture(event: string, properties?: Record<string, unknown>) {
  if (!client) return
  try {
    // PostHog types properties as its own JsonType. Everything passed from the
    // helpers below is already JSON-safe by construction.
    client.capture(event, properties as Parameters<PostHog['capture']>[1])
  } catch {}
}

/** A type alias, not an interface, so it satisfies Record<string, unknown>. */
export type QuestionContext = {
  questionId: string
  category: string
  difficulty: string
  gameMode: string
}

export const analytics = {
  /**
   * A question was shown. Paired with answer_submitted this gives the same
   * correct-rate the server computes, but sliced by what the player saw rather
   * than by what was recorded — the gap between the two is abandonment.
   */
  questionPresented: (ctx: QuestionContext & { position: number }) =>
    capture('question_presented', ctx),

  answerSubmitted: (ctx: QuestionContext & { isCorrect: boolean; timeTakenMs: number; timedOut: boolean }) =>
    capture('answer_submitted', ctx),

  /**
   * The player told us a question is wrong. Low volume and high value: this is
   * the only signal that separates "hard" from "broken" before the correct-rate
   * outlier rules have enough answers to fire.
   */
  questionFlagged: (ctx: { questionId: string; category: string; difficulty: string }) =>
    capture('question_flagged', ctx),

  /**
   * A round could not be built because a bucket was too shallow. The server
   * throws "Insufficient questions" here; without this event the failure is a
   * 500 in a log rather than a category anyone knows is starving.
   */
  bankShortfall: (ctx: { category: string; gameMode: string; reason: string }) =>
    capture('bank_shortfall', ctx),

  roundStarted: (ctx: { category: string; difficulty: string; gameMode: string }) =>
    capture('round_started', ctx),

  roundCompleted: (ctx: {
    category: string
    gameMode: string
    correctCount: number
    totalQuestions: number
    xpEarned: number
  }) => capture('round_completed', ctx),

  /** Flush before backgrounding so a session's tail is not lost. */
  flush: () => {
    if (!client) return
    try {
      void client.flush()
    } catch {}
  },
}
