import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { LeaderboardPeriod } from '../../types/api'
import { colors, spacing, radius, fontSize } from '../../constants/theme'
import { getResetMs, formatCountdown } from '../../utils/leaderboard'

interface Props {
  period: LeaderboardPeriod
}

export function ResetCountdown({ period }: Props) {
  const [msLeft, setMsLeft] = useState(() => getResetMs(period))

  useEffect(() => {
    setMsLeft(getResetMs(period))
    const interval = setInterval(() => {
      setMsLeft(getResetMs(period))
    }, 60_000)
    return () => clearInterval(interval)
  }, [period])

  if (msLeft == null) return null

  const label = period === 'today' ? 'Daily reset' : 'Weekly reset'

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⏱</Text>
      <Text style={styles.text}>
        {label} in <Text style={styles.time}>{formatCountdown(msLeft)}</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: fontSize.xs,
  },
  text: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  time: {
    color: colors.primary,
    fontWeight: '700',
  },
})
