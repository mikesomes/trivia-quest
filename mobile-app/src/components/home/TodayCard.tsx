import React, { useEffect, useRef } from 'react'
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native'
import { CalendarStar, Target } from 'phosphor-react-native'
import { colors, fontSize, iconSize, radius, spacing } from '../../constants/theme'
import { useDailyChallengeStatus, useStartDailyChallenge } from '../../hooks/useDailyChallenge'
import { useChallenges } from '../../hooks/useChallenges'
import { useEasternMidnightCountdown } from '../../hooks/useEasternMidnightCountdown'
import type { Challenge } from '../../api/challenges'
import { GradientCard } from '../ui/GradientCard'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { Pulse } from '../ui/Pulse'
import { IconTile } from '../ui/IconTile'
import { Skeleton, SkeletonBox } from '../ui/Skeleton'
import { AppIcon } from '../ui/AppIcon'
import type { IconName } from '../ui/iconRegistry'
import { tabularNums } from '../ui/Typography'
import { FlameIcon, CorrectIcon } from '../icons'

function RowSkeleton({ label }: { label: string }) {
  return (
    <Skeleton label={label} style={styles.row}>
      <SkeletonBox width={40} height={40} borderRadius={radius.md} />
      <View style={styles.rowBody}>
        <SkeletonBox width="45%" height={13} />
        <SkeletonBox width="70%" height={11} style={{ marginTop: spacing.xs }} />
      </View>
    </Skeleton>
  )
}

function Divider() {
  return <View style={styles.divider} />
}

function ChallengeRow() {
  const { data: status, isLoading } = useDailyChallengeStatus()
  const startChallenge = useStartDailyChallenge()
  const timeLeft = useEasternMidnightCountdown()

  if (isLoading) return <RowSkeleton label="Loading daily challenge" />

  const completed = status?.alreadyCompleted ?? false
  const streak = status?.streak ?? 0

  return (
    <View style={styles.row}>
      <IconTile color={colors.primary}>
        <CalendarStar weight="duotone" size={22} color={colors.primary} />
      </IconTile>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>Daily Challenge</Text>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <FlameIcon size={12} />
              <Text style={styles.streakCount}>{streak}</Text>
            </View>
          )}
        </View>
        {completed ? (
          <View style={styles.rowStatusLine}>
            <CorrectIcon size={13} weight="fill" />
            <Text style={styles.rowStatusText} numberOfLines={1}>
              {status?.correctCount !== undefined
                ? `${status.correctCount}/10 · ${(status.xpEarned ?? 0).toLocaleString()} XP · next in ${timeLeft}`
                : `Completed · next in ${timeLeft}`}
            </Text>
          </View>
        ) : (
          <Text style={styles.rowSubtitle}>Same 10 questions for everyone</Text>
        )}
      </View>
      {!completed && (
        <Pulse>
          <AnimatedPressable
            style={styles.actionPill}
            onPress={() => startChallenge.mutate()}
            disabled={startChallenge.isPending}
            activeOpacity={0.85}
          >
            {startChallenge.isPending ? (
              <ActivityIndicator color={colors.textOnAccent} size="small" />
            ) : (
              <Text style={styles.actionPillText}>Play</Text>
            )}
          </AnimatedPressable>
        </Pulse>
      )}
    </View>
  )
}

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
  const fill = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fill, {
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
          <Text style={[styles.questRowLabel, challenge.isComplete && styles.questRowLabelDone]} numberOfLines={1}>
            {challenge.label}
          </Text>
          {challenge.isComplete ? (
            <CorrectIcon size={14} weight="fill" />
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
                width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  )
}

/**
 * Surfaces the server-side daily/weekly XP challenges (progress is tracked in
 * submit-answer and XP auto-awarded on completion).
 */
function QuestsSection() {
  const { data, isLoading } = useChallenges()

  if (isLoading) return <RowSkeleton label="Loading quests" />
  if (!data?.challenges.length) return null

  const daily = data.challenges.filter(c => c.period === 'daily')
  const weekly = data.challenges.filter(c => c.period === 'weekly')
  const completedCount = data.challenges.filter(c => c.isComplete).length

  return (
    <>
      <Divider />
      <View style={styles.questsSection}>
        <View style={styles.questsHeader}>
          <IconTile color={colors.streakActive} size={32}>
            <Target weight="duotone" size={18} color={colors.streakActive} />
          </IconTile>
          <Text style={styles.rowTitle}>Quests</Text>
          <Text style={styles.counter}>{completedCount}/{data.challenges.length}</Text>
        </View>
        {daily.length > 0 && (
          <View style={styles.questGroup}>
            <Text style={styles.sectionLabel}>Today</Text>
            {daily.map(c => <QuestRow key={c.id} challenge={c} />)}
          </View>
        )}
        {weekly.length > 0 && (
          <View style={styles.questGroup}>
            <Text style={styles.sectionLabel}>This Week</Text>
            {weekly.map(c => <QuestRow key={c.id} challenge={c} />)}
          </View>
        )}
      </View>
    </>
  )
}

/** Consolidates the daily challenge and daily/weekly quests into one card. */
export function TodayCard() {
  return (
    <GradientCard accentColor={colors.primary} contentStyle={styles.card}>
      <ChallengeRow />
      <QuestsSection />
    </GradientCard>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  rowSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary },
  rowStatusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowStatusText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.streakActive}22`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    gap: 2,
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
  },
  streakCount: { ...tabularNums, fontSize: fontSize.xs, fontWeight: '800', color: colors.streakActive },
  actionPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textOnAccent },
  questsSection: { gap: spacing.sm },
  questsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  counter: {
    ...tabularNums,
    marginLeft: 'auto',
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.streakActive,
  },
  questGroup: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
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
})
