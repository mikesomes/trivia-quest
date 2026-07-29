import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, iconSize, radius, spacing, surfaces } from '../../constants/theme'
import type { Achievement } from '../../types/user'
import { MedalIcon } from '../icons'
import { AppIcon } from '../ui/AppIcon'
import { achievementIconName } from '../ui/iconRegistry'

const RARITY_COLORS: Record<string, string> = {
  common:    '#6b7280',
  rare:      '#3B82F6',
  epic:      '#8B5CF6',
  legendary: '#F59E0B',
}

interface Props {
  achievements: Achievement[]
}

export function NewAchievementsToast({ achievements }: Props) {
  const translateY = useRef(new Animated.Value(120)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (achievements.length === 0) return

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start()
  }, [achievements.length])

  if (achievements.length === 0) return null

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.headerRow}>
        <MedalIcon size={16} />
        <Text style={styles.header}>
          {achievements.length === 1 ? 'Achievement Unlocked!' : `${achievements.length} Achievements Unlocked!`}
        </Text>
      </View>
      {achievements.map((a) => {
        const color = RARITY_COLORS[a.rarity] ?? RARITY_COLORS.common
        return (
          <View key={a.id} style={[styles.row, { borderLeftColor: color }]}>
            <AppIcon name={achievementIconName(a.id)} size={iconSize.lg} color={color} style={styles.rowIcon} />
            <View style={styles.rowText}>
              <Text style={styles.rowName}>{a.name}</Text>
              <Text style={styles.rowDesc}>{a.description}</Text>
            </View>
            <Text style={[styles.rowRarity, { color }]}>{a.rarity.toUpperCase()}</Text>
          </View>
        )
      })}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: surfaces.surface3,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  header: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
  },
  rowIcon: { width: 32, alignItems: 'center' },
  rowText: { flex: 1 },
  rowName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  rowDesc: { fontSize: fontSize.xs, color: colors.textSecondary },
  rowRarity: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
})
