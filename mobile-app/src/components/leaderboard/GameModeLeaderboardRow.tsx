import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { LeaderboardEntry } from '../../types/api'
import type { GameModeTab } from '../../store/leaderboardStore'
import { colors, spacing, fontSize, radius } from '../../constants/theme'
import { getRankMovement } from '../../utils/leaderboard'
import { MovementBadge } from './MovementBadge'
import { tabularNums } from '../ui/Typography'

const RANK_META: Record<number, { color: string; bg: string; medal: string }> = {
  1: { color: colors.gold, bg: 'rgba(255,215,0,0.08)',   medal: '🥇' },
  2: { color: colors.silver, bg: 'rgba(192,192,192,0.07)', medal: '🥈' },
  3: { color: colors.bronze, bg: 'rgba(205,127,50,0.08)',  medal: '🥉' },
}

const MODE_ACCENT: Record<Exclude<GameModeTab, 'xp'>, { color: string; bg: string }> = {
  classic:  { color: '#4A9EFF', bg: 'rgba(74,158,255,0.15)' },
  survival: { color: '#FF6B35', bg: 'rgba(255,107,53,0.15)' },
  blitz:    { color: colors.gold, bg: 'rgba(255,215,0,0.15)'  },
}

function formatProgress(entry: LeaderboardEntry, mode: Exclude<GameModeTab, 'xp'>): string {
  if (mode === 'classic') {
    const round = entry.sessionRound ?? 1
    const q = entry.totalQuestions ?? 10
    return `Round ${round}, Q${q}`
  }
  if (mode === 'survival') {
    const n = entry.questionsAnswered ?? 0
    return `${n} Question${n !== 1 ? 's' : ''}`
  }
  // blitz
  const n = entry.correctCount ?? 0
  return `${n} Correct`
}

interface Props {
  entry: LeaderboardEntry
  isCurrentUser: boolean
  mode: Exclude<GameModeTab, 'xp'>
}

export function GameModeLeaderboardRow({ entry, isCurrentUser, mode }: Props) {
  const podium = RANK_META[entry.rank]
  const isTop3 = entry.rank <= 3
  const accent = MODE_ACCENT[mode]
  const progressText = formatProgress(entry, mode)
  const movement = getRankMovement(entry.rank, entry.previousRank)
  const showMovement = entry.previousRank !== undefined

  const rowStyle = [
    styles.row,
    isTop3 && { backgroundColor: podium.bg, borderLeftWidth: 3, borderLeftColor: podium.color },
    isCurrentUser && styles.currentUserRow,
  ]

  return (
    <View style={rowStyle}>
      <View style={styles.rankCol}>
        {isTop3 ? (
          <Text style={[styles.medal, isCurrentUser && { fontSize: 22 }]}>
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
        <Text style={styles.subtitle}>Lv.{entry.level}</Text>
      </View>

      <View style={styles.rightCol}>
        {showMovement && <MovementBadge movement={movement} />}
        <View style={[styles.progressBadge, { backgroundColor: accent.bg }]}>
          <Text style={[styles.progressText, { color: accent.color }]}>
            {progressText}
          </Text>
        </View>
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
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  progressBadge: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
})
