import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import type { Achievement } from '../../types/user'

const RARITY_COLORS: Record<string, string> = {
  common:    '#6b7280',
  rare:      '#3B82F6',
  epic:      '#8B5CF6',
  legendary: '#F59E0B',
}

interface Props {
  achievement: Achievement
  earned?: boolean
}

export function AchievementBadge({ achievement, earned = true }: Props) {
  const accentColor = earned ? RARITY_COLORS[achievement.rarity] ?? RARITY_COLORS.common : colors.textMuted

  return (
    <View style={[styles.badge, { borderColor: `${accentColor}55`, opacity: earned ? 1 : 0.4 }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
        <Text style={styles.icon}>{earned ? achievement.icon : '🔒'}</Text>
      </View>
      <Text style={[styles.name, { color: earned ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
        {achievement.name}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>{achievement.description}</Text>
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
  icon: { fontSize: 22 },
  name: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  desc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  rarity: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
})
