import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, radius, fontSize } from '../../constants/theme'
import { formatNumber } from '../../utils/format'
import type { LeaderboardEntry } from '../../types/api'

interface Props {
  userEntry: { rank: number; primaryValue: number } | null
  displayName: string
  entries: LeaderboardEntry[]
}

export function MyRankBanner({ userEntry, displayName, entries }: Props) {
  if (!userEntry) return null

  const isInVisibleList = entries.some((e) => e.rank === userEntry.rank)
  if (isInVisibleList) return null

  const nextEntry = entries.find((e) => e.rank === userEntry.rank - 1)
  const xpGap = nextEntry ? Math.max(0, nextEntry.primaryValue - userEntry.primaryValue) : null

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{userEntry.rank}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          {xpGap != null && xpGap > 0 && (
            <Text style={styles.gap}>
              {formatNumber(xpGap)} XP behind #{userEntry.rank - 1}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.xp}>{formatNumber(userEntry.primaryValue)} XP</Text>
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
  xp: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primaryLight,
  },
})
