import React, { useEffect, useRef } from 'react'
import { Animated, Easing, View, Text, StyleSheet } from 'react-native'
import { colors, spacing, fontSize } from '../../constants/theme'
import { tabularNums } from '../ui/Typography'

const STREAK_THRESHOLD = 3

interface StreakIndicatorProps {
  streak: number
}

export function StreakIndicator({ streak }: StreakIndicatorProps) {
  const scale = useRef(new Animated.Value(1)).current
  const prevStreak = useRef(streak)

  // Pop on every increment so the flame visibly reacts each time the streak grows
  useEffect(() => {
    if (streak > prevStreak.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start()
    }
    prevStreak.current = streak
  }, [streak])

  if (streak < 1) return null

  // Building toward streak — show a subtle progress hint
  if (streak < STREAK_THRESHOLD) {
    return (
      <Animated.View style={[styles.building, { transform: [{ scale }] }]}>
        <Text style={styles.buildingText}>
          {'🔥'.repeat(streak)}{'·'.repeat(STREAK_THRESHOLD - streak)}
        </Text>
        <Text style={styles.buildingLabel}>{STREAK_THRESHOLD - streak} more for streak</Text>
      </Animated.View>
    )
  }

  const multiplier = streak >= 10 ? 2.0 : streak >= 8 ? 1.5 : streak >= 5 ? 1.25 : 1.1
  // The flame itself grows larger at each power tier, on top of the per-tap pop
  const flameSize = streak >= 10 ? fontSize.xl : streak >= 8 ? fontSize.lg : streak >= 5 ? fontSize.md : fontSize.sm

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <Text style={[styles.fire, { fontSize: flameSize }]}>🔥</Text>
      <Text style={styles.label}>{streak} streak</Text>
      <Text style={styles.multiplier}>{multiplier.toFixed(1)}x</Text>
    </Animated.View>
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
  label: { ...tabularNums,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.streakActive,
  },
  multiplier: { ...tabularNums,
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
