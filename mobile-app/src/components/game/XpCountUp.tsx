import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated'
import { haptics } from '../../lib/haptics'
import { colors, spacing, fontSize } from '../../constants/theme'
import { levelFromXp, MAX_PLAYER_LEVEL, xpRequiredForLevel } from '../../utils/scoring'
import { getNextLevelUnlock } from '../../constants/progression'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import type { XpAwardBreakdown } from '../../types/user'
import { tabularNums } from '../ui/Typography'

interface Props {
  xpEarned: number
  previousXp: number
  newXp: number
  leveledUp?: boolean
  newLevel?: number
  breakdown?: XpAwardBreakdown
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(value, 1))
}

function normalizeXp(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.round(value))
}

function progressWithinLevel(totalXp: number, level: number) {
  if (level >= MAX_PLAYER_LEVEL) return 1
  const levelStartXp = xpRequiredForLevel(level)
  const levelEndXp = xpRequiredForLevel(level + 1)
  const levelTotalXp = levelEndXp - levelStartXp
  if (levelTotalXp <= 0) return 0
  return clampProgress((totalXp - levelStartXp) / levelTotalXp)
}

export function XpCountUp({
  xpEarned,
  previousXp,
  newXp,
  leveledUp,
  breakdown,
}: Props) {
  const normalizedPreviousXp = normalizeXp(previousXp)
  const normalizedXpEarned = normalizeXp(xpEarned)
  const normalizedNewXp = Math.max(
    normalizedPreviousXp,
    normalizeXp(newXp, normalizedPreviousXp + normalizedXpEarned)
  )

  const glowOpacity = useSharedValue(0)
  const totalGain = normalizedNewXp - normalizedPreviousXp
  const displayXp = useAnimatedNumber(normalizedNewXp, {
    from: normalizedPreviousXp,
    durationMs: (delta) => Math.min(2200, Math.max(1100, delta * 10)),
    steps: (delta) => Math.min(56, Math.max(24, delta)),
  })
  const displayEarnedXp = totalGain > 0
    ? Math.round(normalizedXpEarned * clampProgress((displayXp - normalizedPreviousXp) / totalGain))
    : normalizedXpEarned
  const displayedLevelRef = useRef(levelFromXp(normalizedPreviousXp))
  const sparkleFiredRef = useRef(false)

  const displayLevel = levelFromXp(displayXp)
  const nextUnlock = getNextLevelUnlock(displayLevel)

  const startLevel = levelFromXp(normalizedPreviousXp)
  const levelStartXp = xpRequiredForLevel(displayLevel)
  const levelEndXp = xpRequiredForLevel(displayLevel + 1)
  const levelTotalXp = levelEndXp - levelStartXp
  const levelCurrentXp = Math.max(0, displayXp - levelStartXp)
  const baseProgress = displayLevel > startLevel
    ? 0
    : progressWithinLevel(normalizedPreviousXp, displayLevel)
  const currentProgress = progressWithinLevel(displayXp, displayLevel)
  const earnedProgress = Math.max(0, currentProgress - baseProgress)
  const xpToNextLevel = displayLevel >= MAX_PLAYER_LEVEL
    ? 0
    : Math.max(0, levelEndXp - displayXp)

  // Fires once per level crossed as displayXp ticks upward mid-animation.
  useEffect(() => {
    const resolvedLevel = levelFromXp(displayXp)
    if (resolvedLevel > displayedLevelRef.current) {
      displayedLevelRef.current = resolvedLevel
      haptics.reward()
      glowOpacity.value = withSequence(
        withTiming(0.9, { duration: 120 }),
        withTiming(0, { duration: 500 })
      )
    }
  }, [displayXp, glowOpacity])

  // A smaller sparkle once the count-up finishes, when it didn't already level up.
  useEffect(() => {
    if (sparkleFiredRef.current) return
    if (totalGain > 0 && displayXp === normalizedNewXp && !leveledUp && normalizedXpEarned > 0) {
      sparkleFiredRef.current = true
      glowOpacity.value = withSequence(
        withTiming(0.55, { duration: 100 }),
        withTiming(0, { duration: 420 })
      )
    }
  }, [displayXp, totalGain, normalizedNewXp, leveledUp, normalizedXpEarned, glowOpacity])

  const glowAnimatedStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }))

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>XP Earned</Text>
        {leveledUp && (
          <Text style={styles.levelUpBadge}>Level {displayLevel} 🎉</Text>
        )}
      </View>

      <View style={styles.countContainer}>
        <Text style={styles.count}>+{displayEarnedXp}</Text>
        <Text style={styles.countLabel}>XP this round</Text>
      </View>

      {breakdown && breakdown.total > 0 && (
        <View style={styles.breakdownCard}>
          <BreakdownLine label="Answer XP" value={breakdown.answerBase} />
          <BreakdownLine label="Speed" value={breakdown.speedBonus} />
          <BreakdownLine label="Difficulty" value={breakdown.difficultyBonus} />
          <BreakdownLine label="Streak" value={breakdown.streakBonus} highlight />
          <BreakdownLine label="Round Complete" value={breakdown.completionBonus} />
          <BreakdownLine label="Perfect Round" value={breakdown.perfectBonus} highlight />
          <BreakdownLine label="No Lives Lost" value={breakdown.noLivesLostBonus} />
          <BreakdownLine label="Daily Challenge" value={breakdown.dailyChallengeBonus} />
          <BreakdownLine label="First Round Today" value={breakdown.firstRoundBonus} />
          <BreakdownLine label="⚡ Momentum Bonus" value={breakdown.momentumBonus ?? 0} highlight />
        </View>
      )}

      <View style={styles.barSection}>
        <View style={styles.barHeader}>
          <View>
            <Text style={styles.barLabel}>
              {displayLevel >= MAX_PLAYER_LEVEL ? 'Master Tier' : `Level ${displayLevel}`}
            </Text>
            <Text style={styles.barSubLabel}>
              Total XP {displayXp.toLocaleString()}
            </Text>
          </View>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>+{displayEarnedXp} XP</Text>
          </View>
        </View>

        <View style={styles.barTrackContainer}>
          <Animated.View
            style={[
              styles.barGlow,
              glowAnimatedStyle,
              {
                left: `${baseProgress * 100}%`,
                width: `${earnedProgress * 100}%`,
              },
            ]}
          />

          <View style={styles.barTrack}>
            <View
              style={[
                styles.barBaseFill,
                {
                  width: `${baseProgress * 100}%`,
                },
              ]}
            />
            <View
              style={[
                styles.barEarnedFill,
                {
                  left: `${baseProgress * 100}%`,
                  width: `${earnedProgress * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.barMetaRow}>
          <Text style={styles.barMetaText}>
            {displayLevel >= MAX_PLAYER_LEVEL ? 'Cap reached' : `${levelCurrentXp.toLocaleString()} / ${levelTotalXp.toLocaleString()} XP`}
          </Text>
          <Text style={styles.barXp}>
            {displayLevel >= MAX_PLAYER_LEVEL ? 'Max level' : `${xpToNextLevel.toLocaleString()} to next`}
          </Text>
        </View>
      </View>

      {nextUnlock && (
        <View style={styles.unlockRow}>
          <Text style={styles.unlockLabel}>Next unlock</Text>
          <Text style={styles.unlockText}>Level {nextUnlock.level}: {nextUnlock.label}</Text>
        </View>
      )}
    </View>
  )
}

function BreakdownLine({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  if (!value) return null
  return (
    <View style={styles.breakdownLine}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, highlight && styles.breakdownValueHighlight]}>+{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  levelUpBadge: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primary,
  },
  countContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  count: { ...tabularNums,
    fontSize: 56,
    fontWeight: '900',
    color: colors.primary,
  },
  countLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  breakdownCard: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  breakdownLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  breakdownValueHighlight: {
    color: colors.streakActive,
  },
  barSection: {
    width: '100%',
    gap: spacing.md,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  barLabel: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  barSubLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  barXp: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  counterBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
  },
  counterBadgeText: { ...tabularNums,
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: colors.primary,
  },
  barTrackContainer: {
    position: 'relative',
    height: 12,
  },
  barGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    backgroundColor: colors.streakActive,
    borderRadius: 6,
    opacity: 0,
    shadowColor: colors.streakActive,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  barTrack: {
    height: '100%',
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barBaseFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  barEarnedFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.streakActive,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    minWidth: 0,
  },
  barMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  unlockRow: {
    width: '100%',
    backgroundColor: `${colors.streakActive}15`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
    padding: spacing.md,
    gap: spacing.xs,
  },
  unlockLabel: {
    fontSize: fontSize.xs,
    color: colors.streakActive,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  unlockText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '800',
  },
})
