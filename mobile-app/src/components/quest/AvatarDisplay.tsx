import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import { getAvatarStage } from '../../constants/quest'
import { PlayerAvatar } from '../profile/PlayerAvatar'
import { tabularNums } from '../ui/Typography'

interface Props {
  level: number
  displayName: string
}

export function AvatarDisplay({ level, displayName }: Props) {
  const stage = getAvatarStage(level)

  return (
    <View style={styles.container}>
      <PlayerAvatar level={level} size="sm" />
      <View style={styles.info}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={[styles.title, { color: stage.color }]}>{stage.title}</Text>
      </View>
      <View style={[styles.levelBadge, { backgroundColor: stage.color }]}>
        <Text style={styles.levelText}>Lv.{level}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  title: { fontSize: fontSize.sm, fontWeight: '600' },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  levelText: { ...tabularNums, fontSize: fontSize.sm, fontWeight: '800', color: colors.textOnAccent },
})
