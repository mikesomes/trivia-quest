import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import * as Sentry from '@sentry/react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'
import { WarningIcon } from '../icons'

interface State { hasError: boolean; eventId: string | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, eventId: null }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const eventId = Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
    this.setState({ eventId })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <View style={styles.container}>
        <WarningIcon size={44} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>The error has been reported. Try restarting the app.</Text>
        {this.state.eventId && (
          <Text style={styles.eventId}>Ref: {this.state.eventId.slice(0, 8)}</Text>
        )}
        <AnimatedPressable style={styles.button} onPress={() => this.setState({ hasError: false, eventId: null })}>
          <Text style={styles.buttonText}>Try Again</Text>
        </AnimatedPressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  eventId: { fontSize: fontSize.xs, color: colors.textMuted, fontFamily: 'monospace' },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  buttonText: { color: colors.textOnAccent, fontWeight: '700', fontSize: fontSize.md },
})
