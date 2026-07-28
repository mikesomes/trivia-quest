import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, radius, fontSize } from '../../constants/theme'
import { formatNumber } from '../../utils/format'
import { getRankMovement } from '../../utils/leaderboard'
import { MovementBadge } from './MovementBadge'
import type { LeaderboardEntry } from '../../types/api'

interface Props {
  userEntry: { rank: number; primaryValue: number; previousRank?: number | null } | null
  displayName: string
  entries: LeaderboardEntry[]
  /** Unit shown next to the value — modes aren't all ranked by XP (e.g. Blitz = "correct", Survival = "questions"). */
  unitLabel: string
}

export function MyRankBanner({ userEntry, displayName, entries, unitLabel }: Props) {
  if (!userEntry) return null

  const isInVisibleList = entries.some((e) => e.rank === userEntry.rank)
  if (isInVisibleList) return null

  const nextEntry = entries.find((e) => e.rank === userEntry.rank - 1)
  const gap = nextEntry ? Math.max(0, nextEntry.primaryValue - userEntry.primaryValue) : null
  const showMovement = userEntry.previousRank !== undefined

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{userEntry.rank}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          {gap != null && gap > 0 && (
            <Text style={styles.gap}>
              {formatNumber(gap)} {unitLabel} behind #{userEntry.rank - 1}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.rightSection}>
        {showMovement && <MovementBadge movement={getRankMovement(userEntry.rank, userEntry.previousRank)} />}
        <Text style={styles.value}>{formatNumber(userEntry.primaryValue)} {unitLabel}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${colors.primary}20`,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rankBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: '#fff',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  gap: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primaryLight,
  },
})
