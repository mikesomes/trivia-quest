import * as Sentry from '@sentry/react-native'

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: process.env.EXPO_PUBLIC_ENV === 'production',

    // Capture 100% of errors, 10% of performance traces
    tracesSampleRate: 0.1,
    sampleRate: 1.0,

  })
}

/**
 * Attach the Supabase user id to crash reports.
 *
 * beforeSend used to sit here as an empty passthrough with a comment promising
 * to "attach user context once available" — so every crash was anonymous and
 * could not be matched to the session that produced it. Setting the same id
 * PostHog uses lines the two up.
 */
export function setSentryUser(userId: string | null) {
  Sentry.setUser(userId ? { id: userId } : null)
}

export { Sentry }
