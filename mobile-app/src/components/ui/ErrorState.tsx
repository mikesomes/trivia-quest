import React from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { WarningIcon } from '../icons'
import { AnimatedPressable } from './AnimatedPressable'

interface Props {
  /** What failed, in the player's terms. Falls back to a generic line. */
  message?: string
  onRetry?: () => void
  retryLabel?: string
  /** `inline` sits inside a card; `block` stands alone in a section. */
  variant?: 'inline' | 'block'
  style?: ViewStyle
}

/**
 * A failure the player can act on, shown in place rather than as a native
 * Alert. Alerts interrupt, look nothing like the rest of the app, and give no
 * way to retry without repeating the whole action.
 */
export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
  retryLabel = 'Try again',
  variant = 'block',
  style,
}: Props) {
  return (
    <View
      style={[variant === 'block' ? styles.block : styles.inline, style]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <View style={styles.row}>
        <WarningIcon size={16} color={colors.incorrect} />
        <Text style={styles.message}>{message}</Text>
      </View>
      {onRetry && (
        <AnimatedPressable
          style={styles.retry}
          onPress={onRetry}
          activeOpacity={0.85}
          accessibilityLabel={retryLabel}
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </AnimatedPressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.incorrectBg,
    borderWidth: 1,
    borderColor: `${colors.incorrect}66`,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  inline: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  retry: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.incorrect}88`,
  },
  retryText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.incorrect,
  },
})
