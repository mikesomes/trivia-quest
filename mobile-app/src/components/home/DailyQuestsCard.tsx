import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { Target } from 'phosphor-react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { useChallenges } from '../../hooks/useChallenges'
import type { Challenge } from '../../api/challenges'
import { GradientCard } from '../ui/GradientCard'

function QuestRow({ challenge }: { challenge: Challenge }) {
  const pct = Math.min(1, challenge.progress / challenge.target)
  const fill = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fill, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false, // animating width
    }).start()
  }, [pct])

  return (
    <View style={styles.row}>
      <Text style={styles.rowEmoji}>{challenge.emoji}</Text>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowLabel, challenge.isComplete && styles.rowLabelDone]} numberOfLines={1}>
            {challenge.label}
          </Text>
          {challenge.isComplete ? (
            <Text style={styles.doneCheck}>✓</Text>
          ) : (
            <Text style={styles.rewardChip}>+{challenge.xpReward.toLocaleString()} XP</Text>
          )}
        </View>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              challenge.isComplete && styles.barFillDone,
              {
                width: fill.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.min(challenge.progress, challenge.target)}/{challenge.target}
        </Text>
      </View>
    </View>
  )
}

/**
 * Surfaces the server-side daily/weekly XP challenges (progress is tracked in
 * submit-answer and XP auto-awarded on completion).
 */
export function DailyQuestsCard() {
  const { data, isLoading } = useChallenges()

  if (isLoading || !data?.challenges.length) return null

  const daily = data.challenges.filter(c => c.period === 'daily')
  const weekly = data.challenges.filter(c => c.period === 'weekly')
  const completedCount = data.challenges.filter(c => c.isComplete).length

  return (
    <GradientCard accentColor={colors.streakActive} style={styles.card} contentStyle={styles.cardContent}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Target weight="duotone" size={22} color={colors.streakActive} />
          </View>
          <View>
            <Text style={styles.title}>Quests</Text>
            <Text style={styles.subtitle}>Bonus XP for playing your way</Text>
          </View>
        </View>
        <Text style={styles.counter}>
          {completedCount}/{data.challenges.length}
        </Text>
      </View>

      {daily.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Today</Text>
          {daily.map(c => <QuestRow key={c.id} challenge={c} />)}
        </View>
      )}
      {weekly.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>This Week</Text>
          {weekly.map(c => <QuestRow key={c.id} challenge={c} />)}
        </View>
      )}
    </GradientCard>
  )
}

const styles = StyleSheet.create({
  card: {
    borderColor: `${colors.streakActive}44`,
  },
  cardContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: `${colors.streakActive}22`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  counter: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.streakActive,
    fontVariant: ['tabular-nums'],
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  rowBody: { flex: 1, gap: 4 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowLabelDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  doneCheck: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.correct,
  },
  rewardChip: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.streakActive,
  },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.streakActive,
  },
  barFillDone: {
    backgroundColor: colors.correct,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
})
