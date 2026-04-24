import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, fontSize } from '../../constants/theme'

const STREAK_THRESHOLD = 3

interface StreakIndicatorProps {
  streak: number
}

export function StreakIndicator({ streak }: StreakIndicatorProps) {
  if (streak < 1) return null

  // Building toward streak — show a subtle progress hint
  if (streak < STREAK_THRESHOLD) {
    return (
      <View style={styles.building}>
        <Text style={styles.buildingText}>
          {'🔥'.repeat(streak)}{'·'.repeat(STREAK_THRESHOLD - streak)}
        </Text>
        <Text style={styles.buildingLabel}>{STREAK_THRESHOLD - streak} more for streak</Text>
      </View>
    )
  }

  const multiplier = streak >= 10 ? 2.0 : streak >= 8 ? 1.5 : streak >= 5 ? 1.25 : 1.1

  return (
    <View style={styles.container}>
      <Text style={styles.fire}>🔥</Text>
      <Text style={styles.label}>{streak} streak</Text>
      <Text style={styles.multiplier}>{multiplier.toFixed(1)}x</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.streakActive,
  },
  fire: { fontSize: fontSize.sm },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.streakActive,
  },
  multiplier: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.streakActive,
    opacity: 0.85,
  },
  building: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
    backgroundColor: `${colors.streakActive}0a`,
  },
  buildingText: {
    fontSize: fontSize.sm,
    letterSpacing: 2,
  },
  buildingLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
})
