import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ProgressBar } from '../ui/ProgressBar'
import { colors, spacing, fontSize } from '../../constants/theme'
import { MAX_PLAYER_LEVEL, xpRequiredForLevel } from '../../utils/scoring'
import { getKnowledgeRank, getNextLevelUnlock } from '../../constants/progression'

interface XpProgressBarProps {
  currentXp: number
  level: number
  xpToNextLevel: number
}

export function XpProgressBar({ currentXp, level, xpToNextLevel }: XpProgressBarProps) {
  const levelStartXp = xpRequiredForLevel(level)
  const levelTotalXp = xpRequiredForLevel(level + 1) - levelStartXp
  const levelCurrentXp = currentXp - levelStartXp
  const isCapped = level >= MAX_PLAYER_LEVEL
  const progress = isCapped ? 1 : levelTotalXp > 0 ? levelCurrentXp / levelTotalXp : 0
  const nextUnlock = getNextLevelUnlock(level)
  const rank = getKnowledgeRank(level)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelLabel}>Level {level} · {rank.title}</Text>
        <Text style={styles.xpLabel}>{isCapped ? 'Master tier' : `${xpToNextLevel} XP to next level`}</Text>
      </View>
      <ProgressBar progress={progress} color={colors.primary} height={8} />
      {nextUnlock && (
        <Text style={styles.unlockLabel}>Next unlock: Level {nextUnlock.level} · {nextUnlock.label}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  levelLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  xpLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  unlockLabel: { fontSize: fontSize.xs, color: colors.streakActive, fontWeight: '700' },
})
