import React from 'react'
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import { CalendarStar } from 'phosphor-react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { useDailyChallengeStatus, useStartDailyChallenge } from '../../hooks/useDailyChallenge'
import { useEasternMidnightCountdown } from '../../hooks/useEasternMidnightCountdown'
import { GradientCard } from '../ui/GradientCard'
import { Pulse } from '../ui/Pulse'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { tabularNums } from '../ui/Typography'
import { FlameIcon } from '../icons'
import { CorrectIcon } from '../icons'

export function DailyChallengeCard() {
  const { data: status, isLoading } = useDailyChallengeStatus()
  const startChallenge = useStartDailyChallenge()
  const timeLeft = useEasternMidnightCountdown()

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    )
  }

  const completed = status?.alreadyCompleted ?? false
  const streak = status?.streak ?? 0

  return (
    <GradientCard
      accentColor={completed ? colors.correct : colors.primary}
      style={completed ? styles.cardCompleted : styles.card}
      contentStyle={styles.cardContent}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
              <CalendarStar weight="duotone" size={22} color={colors.primary} />
            </View>
          <View>
            <Text style={styles.title}>Daily Challenge</Text>
            <Text style={styles.subtitle}>Same 10 questions for everyone</Text>
          </View>
        </View>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <FlameIcon size={14} />
            <Text style={styles.streakCount}>{streak}</Text>
          </View>
        )}
      </View>

      {completed ? (
        // Completed state
        <View style={styles.completedBody}>
          <View style={styles.completedRow}>
            <CorrectIcon size={14} weight="fill" />
            <View>
              <Text style={styles.completedText}>Completed!</Text>
              {status?.correctCount !== undefined && (
                <Text style={styles.completedXp}>
                  {status.correctCount}/10 correct · {(status.xpEarned ?? 0).toLocaleString()} XP
                </Text>
              )}
            </View>
          </View>
          <View style={styles.nextRow}>
            <Text style={styles.nextLabel}>Next challenge in</Text>
            <Text style={styles.countdown}>{timeLeft}</Text>
          </View>
        </View>
      ) : (
        // Available state
        <Pulse>
          <AnimatedPressable
            style={styles.playButton}
            onPress={() => startChallenge.mutate()}
            disabled={startChallenge.isPending}
            activeOpacity={0.85}
          >
            {startChallenge.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.playText}>Play Today's Challenge</Text>
            )}
          </AnimatedPressable>
        </Pulse>
      )}
    </GradientCard>
  )
}

const styles = StyleSheet.create({
  card: {
    borderColor: `${colors.primary}55`,
  },
  cardCompleted: {
    borderColor: `${colors.correct}55`,
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
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.streakActive}22`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
  },
  streakCount: { ...tabularNums, fontSize: fontSize.md, fontWeight: '800', color: colors.streakActive },
  playButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  playText: { fontSize: fontSize.md, fontWeight: '700', color: colors.textOnAccent },
  completedBody: { gap: spacing.sm },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkmark: {
    fontSize: 22,
    color: colors.correct,
    fontWeight: '800',
    width: 32,
    textAlign: 'center',
  },
  completedText: { fontSize: fontSize.md, fontWeight: '700', color: colors.correct },
  completedXp: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${colors.border}88`,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  nextLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  countdown: { ...tabularNums, fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
})
