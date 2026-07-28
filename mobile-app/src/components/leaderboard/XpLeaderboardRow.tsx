import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { LeaderboardEntry } from '../../types/api'
import { colors, spacing, fontSize, radius } from '../../constants/theme'
import { formatNumber } from '../../utils/format'
import { getRankMovement } from '../../utils/leaderboard'
import { MovementBadge } from './MovementBadge'
import { tabularNums } from '../ui/Typography'

const RANK_META: Record<number, { color: string; bg: string; medal: string }> = {
  1: { color: colors.gold, bg: 'rgba(255,215,0,0.08)',   medal: colors.gold },
  2: { color: colors.silver, bg: 'rgba(192,192,192,0.07)', medal: colors.silver },
  3: { color: colors.bronze, bg: 'rgba(205,127,50,0.08)',  medal: colors.bronze },
}

interface Props {
  entry: LeaderboardEntry
  isCurrentUser: boolean
  xpGap?: number | null
  nextRankName?: string | null
}

export function XpLeaderboardRow({ entry, isCurrentUser, xpGap, nextRankName }: Props) {
  const podium = RANK_META[entry.rank]
  const isTop3 = entry.rank <= 3
  const movement = getRankMovement(entry.rank, entry.previousRank)
  const showMovement = entry.previousRank !== undefined

  const rowStyle = [
    styles.row,
    isTop3 && { backgroundColor: podium.bg },
    isTop3 && { borderLeftWidth: 3, borderLeftColor: podium.color },
    isCurrentUser && styles.currentUserRow,
  ]

  return (
    <View style={rowStyle}>
      <View style={styles.rankCol}>
        {isTop3 ? (
          <Text style={[styles.medal, isTop3 && { fontSize: isCurrentUser ? 22 : 20 }]}>
            {podium.medal}
          </Text>
        ) : (
          <View style={[styles.rankBadge, isCurrentUser && styles.currentUserRankBadge]}>
            <Text style={[styles.rankText, isCurrentUser && styles.currentUserRankText]}>
              #{entry.rank}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, isTop3 && styles.topName, isCurrentUser && styles.currentUserName]}
            numberOfLines={1}
          >
            {entry.displayName}
          </Text>
          {isCurrentUser && (
            <View style={styles.youPill}>
              <Text style={styles.youPillText}>YOU</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>
          Lv.{entry.level}
          {entry.gamesPlayed != null ? ` · ${entry.gamesPlayed} games` : ''}
        </Text>
        {isCurrentUser && xpGap != null && xpGap > 0 && nextRankName && (
          <Text style={styles.xpGap}>
            {formatNumber(xpGap)} XP behind {nextRankName}
          </Text>
        )}
      </View>

      <View style={styles.rightCol}>
        {showMovement && <MovementBadge movement={movement} />}
        <Text style={[styles.xp, isTop3 && { color: podium.color }, isCurrentUser && styles.currentUserXp]}>
          {formatNumber(entry.primaryValue)} XP
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentUserRow: {
    backgroundColor: `${colors.primary}18`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  rankCol: {
    width: 44,
    alignItems: 'center',
  },
  medal: {
    fontSize: 20,
  },
  rankBadge: {
    width: 36,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserRankBadge: {
    backgroundColor: `${colors.primary}30`,
  },
  rankText: { ...tabularNums,
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  currentUserRankText: { ...tabularNums,
    color: colors.primaryLight,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  topName: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  currentUserName: {
    color: colors.textOnAccent,
  },
  youPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textOnAccent,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  xpGap: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  xp: { ...tabularNums,
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primary,
  },
  currentUserXp: { ...tabularNums,
    color: colors.primaryLight,
  },
})
