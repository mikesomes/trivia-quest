import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors, edges, elevation, fontSize, iconSize, radius, spacing, surfaces } from '../../constants/theme'
import { useDailyChallengeStatus, useStartDailyChallenge } from '../../hooks/useDailyChallenge'
import { useEasternMidnightCompactCountdown } from '../../hooks/useEasternMidnightCountdown'
import { haptics } from '../../lib/haptics'
import { SurfaceCard } from '../ui/SurfaceCard'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { Skeleton, SkeletonBox } from '../ui/Skeleton'
import { AppIcon } from '../ui/AppIcon'
import { tabularNums } from '../ui/Typography'
import { FlameIcon, CorrectIcon } from '../icons'

/**
 * The home screen's featured slot. The daily challenge is the one thing that
 * changes every day and the only thing tied to the day streak, so it carries
 * the screen's single raised surface and its only filled button.
 *
 * Everything else on home is deliberately quieter than this card.
 */
export function DailyChallengeCard() {
  const { data: status, isLoading } = useDailyChallengeStatus()
  const startChallenge = useStartDailyChallenge()
  const timeLeft = useEasternMidnightCompactCountdown()

  if (isLoading) {
    return (
      <SurfaceCard tone="raised" level="medium" accent={colors.primary} cornerRadius={radius.xl} contentStyle={styles.card}>
        <Skeleton label="Loading daily challenge" style={styles.loading}>
          <SkeletonBox width="55%" height={20} />
          <SkeletonBox width="40%" height={13} />
          <SkeletonBox width="100%" height={52} borderRadius={radius.lg} />
        </Skeleton>
      </SurfaceCard>
    )
  }

  const completed = status?.alreadyCompleted ?? false
  const streak = status?.streak ?? 0

  const handlePlay = () => {
    haptics.confirm()
    startChallenge.mutate()
  }

  return (
    <SurfaceCard tone="raised" level="medium" accent={colors.primary} cornerRadius={radius.xl} contentStyle={styles.card}>
      <View style={styles.head}>
        <View style={styles.titleLine}>
          <Text style={styles.title}>Daily Challenge</Text>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <FlameIcon size={12} />
              <Text style={styles.streakCount}>{streak}</Text>
            </View>
          )}
        </View>
        {completed ? (
          <View style={styles.statusLine}>
            <CorrectIcon size={13} weight="fill" />
            <Text style={styles.subtitle} numberOfLines={1}>
              {status?.correctCount !== undefined
                ? `Done · ${status.correctCount}/10 · +${(status.xpEarned ?? 0).toLocaleString()} XP`
                : 'Done for today'}
            </Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Resets in {timeLeft}</Text>
        )}
      </View>

      {completed ? (
        // Matches the CTA's height and radius so finishing the challenge does
        // not collapse the card into a stub — the layout holds all day.
        <View style={styles.restStrip}>
          <Text style={styles.restText}>Next challenge in {timeLeft}</Text>
        </View>
      ) : (
        <AnimatedPressable
          style={styles.cta}
          onPress={handlePlay}
          disabled={startChallenge.isPending}
          activeOpacity={0.85}
          accessibilityLabel="Play today's daily challenge"
          accessibilityState={{ busy: startChallenge.isPending }}
        >
          {startChallenge.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} size="small" />
          ) : (
            <>
              <Text style={styles.ctaText}>Play</Text>
              <AppIcon name="next" size={iconSize.md} color={colors.textOnAccent} />
            </>
          )}
        </AnimatedPressable>
      )}
    </SurfaceCard>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  loading: { gap: spacing.sm },
  head: { gap: spacing.xs },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${colors.streakActive}14`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  streakCount: {
    ...tabularNums,
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.streakActive,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    // Neutral, not primary-tinted: a colored halo under a saturated button is
    // the arcade tell this screen is trying to avoid.
    ...elevation.low,
  },
  ctaText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textOnAccent },
  restStrip: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: surfaces.surface1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: edges.hairline,
    paddingVertical: spacing.md,
  },
  restText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
})
