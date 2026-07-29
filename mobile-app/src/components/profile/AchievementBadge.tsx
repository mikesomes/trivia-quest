import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, iconSize, radius, spacing } from '../../constants/theme'
import type { AchievementCatalogueEntry } from '../../types/user'
import { LockIcon } from '../icons'
import { AppIcon } from '../ui/AppIcon'
import { achievementIconName } from '../ui/iconRegistry'

const RARITY_COLORS: Record<string, string> = {
  common:    '#6b7280',
  rare:      '#3B82F6',
  epic:      '#8B5CF6',
  legendary: '#F59E0B',
}

interface Props {
  achievement: AchievementCatalogueEntry
}

export function AchievementBadge({ achievement }: Props) {
  const { earned, progress } = achievement
  const accentColor = earned ? RARITY_COLORS[achievement.rarity] ?? RARITY_COLORS.common : colors.textMuted
  const pct = !earned && progress && progress.target > 0
    ? Math.min(1, progress.current / progress.target)
    : null

  return (
    <View style={[styles.badge, { borderColor: `${accentColor}55`, opacity: earned ? 1 : 0.6 }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
        {earned ? (
          <AppIcon name={achievementIconName(achievement.id)} size={iconSize.md} color={accentColor} />
        ) : (
          <LockIcon size={iconSize.md} />
        )}
      </View>
      <Text style={[styles.name, { color: earned ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
        {achievement.name}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>{achievement.description}</Text>

      {pct !== null && (
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress!.current.toLocaleString()}/{progress!.target.toLocaleString()}
          </Text>
        </View>
      )}

      <Text style={[styles.rarity, { color: accentColor }]}>{achievement.rarity.toUpperCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    width: '47%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  desc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  progressBlock: {
    width: '100%',
    gap: 2,
    marginTop: 2,
  },
  progressTrack: {
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  rarity: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
})
