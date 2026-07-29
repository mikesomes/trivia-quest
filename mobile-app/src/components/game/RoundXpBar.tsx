import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { colors, spacing, fontSize } from '../../constants/theme'
import { levelFromXp, MAX_PLAYER_LEVEL, xpRequiredForLevel } from '../../utils/scoring'
import { tabularNums } from '../ui/Typography'
import { SparkleIcon } from '../icons'

interface Props {
  currentXp: number
  level: number
  xpEarnedInRound: number
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(value, 1))
}

export function RoundXpBar({
  currentXp,
  level,
  xpEarnedInRound,
}: Props) {
  const roundStartXpRef = useRef(currentXp)
  const baseProgressAnim = useRef(new Animated.Value(0)).current
  const earnedProgressAnim = useRef(new Animated.Value(0)).current

  const roundStartXp = xpEarnedInRound === 0 ? currentXp : roundStartXpRef.current
  const projectedTotalXp = roundStartXp + xpEarnedInRound
  const roundStartLevel = Math.max(level, levelFromXp(roundStartXp))
  const projectedLevel = levelFromXp(projectedTotalXp)

  // Calculate progress within current level (or projected level if leveling up)
  const displayLevel = projectedLevel > roundStartLevel ? projectedLevel : roundStartLevel
  const levelStartXp = xpRequiredForLevel(displayLevel)
  const levelEndXp = xpRequiredForLevel(displayLevel + 1)
  const levelTotalXp = levelEndXp - levelStartXp
  const baseXpInLevel = displayLevel >= MAX_PLAYER_LEVEL
    ? 1
    : clampProgress(levelTotalXp > 0 ? (roundStartXp - levelStartXp) / levelTotalXp : 0)
  const projectedXpInLevel = displayLevel >= MAX_PLAYER_LEVEL
    ? 1
    : clampProgress(levelTotalXp > 0 ? (projectedTotalXp - levelStartXp) / levelTotalXp : 0)
  const earnedProgress = Math.max(0, projectedXpInLevel - baseXpInLevel)

  useEffect(() => {
    if (xpEarnedInRound === 0) {
      roundStartXpRef.current = currentXp
    }
  }, [currentXp, xpEarnedInRound])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(baseProgressAnim, {
        toValue: baseXpInLevel,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(earnedProgressAnim, {
        toValue: earnedProgress,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start()
  }, [baseXpInLevel, earnedProgress])

  const xpToNextLevel = Math.max(0, levelEndXp - projectedTotalXp)
  const leveledUp = projectedLevel > roundStartLevel
  const hasRoundXp = xpEarnedInRound > 0

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelLabel}>
          Level {displayLevel}
          {leveledUp && <SparkleIcon size={13} inline />}
        </Text>
        <Text style={styles.xpLabel}>
          {hasRoundXp && <Text style={styles.roundXpLabel}>+{xpEarnedInRound} XP</Text>}
          {displayLevel >= MAX_PLAYER_LEVEL ? ' · Cap' : hasRoundXp ? ` · ${xpToNextLevel} left` : `${xpToNextLevel} XP`}
        </Text>
      </View>

      {/* Progress bar track */}
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.baseFill,
              {
                width: baseProgressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.earnedFill,
              hasRoundXp && earnedProgress > 0 && styles.earnedFillVisible,
              {
                left: baseProgressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                width: earnedProgressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  leveledUpBadge: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  xpLabel: { ...tabularNums,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  roundXpLabel: {
    color: colors.streakActive,
    fontWeight: '800',
  },
  trackContainer: {
    height: 8,
    position: 'relative',
  },
  track: {
    height: '100%',
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  baseFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  earnedFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.streakActive,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  earnedFillVisible: {
    minWidth: 3,
  },
})
