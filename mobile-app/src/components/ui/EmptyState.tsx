import React from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { colors, fontSize, radius, spacing, surfaces } from '../../constants/theme'
import { GameIcon, type GameIconName } from '../icons'
import { AnimatedPressable } from './AnimatedPressable'

interface Props {
  /** Mark from the game icon set — keeps empty states in the same visual family. */
  icon: GameIconName
  title: string
  /** One line on why it's empty and what fills it. */
  body?: string
  /** Optional way out. Omit when there's nothing useful to do from here. */
  action?: { label: string; onPress: () => void }
  style?: ViewStyle
}

/**
 * The "nothing here yet" state. Every list and collection should render one
 * rather than collapsing to blank space — an empty screen reads as broken,
 * while a designed empty state explains what will fill it.
 */
export function EmptyState({ icon, title, body, action, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWell}>
        <GameIcon name={icon} size={26} color={colors.textSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body && <Text style={styles.body}>{body}</Text>}
      {action && (
        <AnimatedPressable
          style={styles.action}
          onPress={action.onPress}
          activeOpacity={0.85}
          accessibilityLabel={action.label}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </AnimatedPressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: surfaces.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
  action: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: `${colors.primary}66`,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primaryLight,
  },
})
