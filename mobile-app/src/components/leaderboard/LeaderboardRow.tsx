import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { LeaderboardEntry, LeaderboardMode } from '../../types/api'
import { colors, spacing, fontSize } from '../../constants/theme'
import { formatNumber } from '../../utils/format'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  view: LeaderboardMode
  isCurrentUser?: boolean
}

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

export function LeaderboardRow({ entry, view, isCurrentUser }: LeaderboardRowProps) {
  const rankColor = RANK_COLORS[entry.rank] || colors.textSecondary

  const subtitle = view === 'category'
    ? `Lv.${entry.level} · ${entry.gamesPlayed ?? 0} games`
    : `Lv.${entry.level}`

  return (
    <View style={[styles.row, isCurrentUser && styles.highlighted]}>
      <Text style={[styles.rank, { color: rankColor }]}>
        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
      </Text>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.displayName}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
        <Text style={styles.level}>{subtitle}</Text>
      </View>
      <Text style={styles.xp}>{formatNumber(entry.primaryValue)} XP</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  highlighted: {
    backgroundColor: `${colors.primary}15`,
  },
  rank: {
    width: 36,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '700',
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
  level: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  xp: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primary,
  },
})
