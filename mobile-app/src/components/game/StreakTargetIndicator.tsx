import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fontSize } from '../../constants/theme'
import { tabularNums } from '../ui/Typography'

interface StreakTargetIndicatorProps {
  streak: number
  target: number
  mode: 'streak' | 'survival'
}

export function StreakTargetIndicator({ streak, target, mode }: StreakTargetIndicatorProps) {
  const clamped = Math.min(streak, target)
  const pct = target > 0 ? (clamped / target) * 100 : 0
  const reached = streak >= target
  const label = mode === 'survival' ? 'Survive' : 'Streak'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.count, reached && styles.countReached]}>
          {streak} / {target}
        </Text>
      </View>
      <View style={styles.barOuter}>
        <View
          style={[
            styles.barInner,
            { width: `${pct}%`, backgroundColor: reached ? colors.correct : colors.streakActive },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  count: { ...tabularNums,
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  countReached: { ...tabularNums,
    color: colors.correct,
  },
  barOuter: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 3,
  },
})
