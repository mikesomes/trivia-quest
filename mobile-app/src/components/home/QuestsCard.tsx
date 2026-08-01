import React, { useEffect, useRef, useState } from 'react'
import { Animated as RNAnimated, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { colors, edges, fontSize, iconSize, motion, radius, spacing } from '../../constants/theme'
import { useChallenges } from '../../hooks/useChallenges'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import type { Challenge } from '../../api/challenges'
import { SurfaceCard } from '../ui/SurfaceCard'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { Skeleton, SkeletonBox } from '../ui/Skeleton'
import { AppIcon } from '../ui/AppIcon'
import type { IconName } from '../ui/iconRegistry'
import { tabularNums, typography } from '../ui/Typography'
import { CorrectIcon } from '../icons'

// The API also sends an `emoji` per challenge. We render a themed mark instead
// so quests match the rest of the app's iconography; the field is left on the
// response type so the backend contract is unchanged.
function challengeIconName(challenge: Challenge): IconName {
  if (challenge.id.includes('rounds')) return 'victory'
  if (challenge.id.includes('correct')) return 'target'
  return challenge.period === 'weekly' ? 'calendar' : 'quickPlay'
}

function QuestRow({ challenge }: { challenge: Challenge }) {
  const pct = Math.min(1, challenge.progress / challenge.target)
  const fill = useRef(new RNAnimated.Value(0)).current

  useEffect(() => {
    RNAnimated.timing(fill, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false, // animating width
    }).start()
  }, [pct])

  return (
    <View style={styles.questRow}>
      <AppIcon name={challengeIconName(challenge)} size={iconSize.md} style={styles.questRowIcon} />
      <View style={styles.questRowBody}>
        <View style={styles.questRowTop}>
          <Text
            style={[styles.questRowLabel, challenge.isComplete && styles.questRowLabelDone]}
            numberOfLines={1}
          >
            {challenge.label}
          </Text>
          {challenge.isComplete ? (
            <CorrectIcon size={14} weight="fill" />
          ) : (
            <Text style={styles.rewardChip}>+{challenge.xpReward.toLocaleString()} XP</Text>
          )}
        </View>
        <View style={styles.barTrack}>
          <RNAnimated.View
            style={[
              styles.barFill,
              challenge.isComplete && styles.barFillDone,
              { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
      </View>
    </View>
  )
}

/**
 * Server-side daily/weekly XP challenges, collapsed to a single summary row.
 *
 * The full checklist was the bulk of the home screen's density, and it is
 * reference material rather than something you act on from here — progress is
 * tracked in submit-answer and XP is awarded automatically. So the count leads
 * and the detail is one tap away, expanding in place rather than costing a
 * navigation.
 */
export function QuestsCard() {
  const { data, isLoading } = useChallenges()
  const [expanded, setExpanded] = useState(false)
  const reducedMotion = useReducedMotion()
  const caret = useSharedValue(0)

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${caret.value * 180}deg` }],
  }))

  if (isLoading) {
    return (
      <SurfaceCard tone="resting" level="low" contentStyle={styles.card}>
        <Skeleton label="Loading quests" style={styles.summary}>
          <SkeletonBox width="30%" height={15} />
          <SkeletonBox width={56} height={13} style={styles.summaryRight} />
        </Skeleton>
      </SurfaceCard>
    )
  }

  if (!data?.challenges.length) return null

  const daily = data.challenges.filter(c => c.period === 'daily')
  const weekly = data.challenges.filter(c => c.period === 'weekly')
  const completedCount = data.challenges.filter(c => c.isComplete).length
  const allDone = completedCount === data.challenges.length

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    const to = next ? 1 : 0
    caret.value = reducedMotion ? to : withSpring(to, motion.reanimatedSpringSnappy)
  }

  return (
    <SurfaceCard tone="resting" level="low" contentStyle={styles.card}>
      <AnimatedPressable
        onPress={toggle}
        scaleTo={0.99}
        accessibilityLabel={`Quests, ${completedCount} of ${data.challenges.length} complete`}
        accessibilityHint={expanded ? 'Collapses the quest list' : 'Expands the quest list'}
        accessibilityState={{ expanded }}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Quests</Text>
          <View style={styles.summaryRight}>
            <Text style={[styles.counter, allDone && styles.counterDone]}>
              {allDone ? 'All done' : `${completedCount} of ${data.challenges.length}`}
            </Text>
            <Animated.View style={caretStyle}>
              <AppIcon name="expand" size={iconSize.sm} color={colors.textMuted} />
            </Animated.View>
          </View>
        </View>
      </AnimatedPressable>

      {expanded && (
        // No `exiting`: collapse unmounts immediately. Exit layout animations
        // are the flaky ones on Fabric, and an instant collapse reads fine.
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(180)}
          style={styles.detail}
        >
          {daily.length > 0 && (
            <View style={styles.questGroup}>
              <Text style={styles.groupLabel}>Today</Text>
              {daily.map(c => <QuestRow key={c.id} challenge={c} />)}
            </View>
          )}
          {weekly.length > 0 && (
            <View style={styles.questGroup}>
              <Text style={styles.groupLabel}>This Week</Text>
              {weekly.map(c => <QuestRow key={c.id} challenge={c} />)}
            </View>
          )}
        </Animated.View>
      )}
    </SurfaceCard>
  )
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  counter: {
    ...tabularNums,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  counterDone: { color: colors.correct },
  detail: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: edges.hairline,
    gap: spacing.md,
  },
  questGroup: { gap: spacing.sm },
  groupLabel: typography.label,
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  questRowIcon: { width: 28, alignItems: 'center' },
  questRowBody: { flex: 1, gap: 4 },
  questRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  questRowLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  questRowLabelDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  rewardChip: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
  },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: edges.track,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  barFillDone: {
    backgroundColor: colors.correct,
  },
})
