import * as Sentry from '@sentry/react-native'

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: process.env.EXPO_PUBLIC_ENV === 'production',

    // Capture 100% of errors, 10% of performance traces
    tracesSampleRate: 0.1,
    sampleRate: 1.0,

    // Attach user context once available
    beforeSend(event) {
      return event
    },
  })
}

export { Sentry }
