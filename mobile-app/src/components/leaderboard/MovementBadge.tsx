import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius } from '../../constants/theme'
import type { RankMovement } from '../../utils/leaderboard'

interface Props {
  movement: RankMovement
}

export function MovementBadge({ movement }: Props) {
  if (movement.direction === 'new') {
    return (
      <View style={[styles.base, styles.new]}>
        <Text style={[styles.text, styles.newText]}>NEW</Text>
      </View>
    )
  }
  if (movement.direction === 'up') {
    return (
      <View style={[styles.base, styles.up]}>
        <Text style={[styles.text, styles.upText]}>↑{movement.delta}</Text>
      </View>
    )
  }
  if (movement.direction === 'down') {
    return (
      <View style={[styles.base, styles.down]}>
        <Text style={[styles.text, styles.downText]}>↓{movement.delta}</Text>
      </View>
    )
  }
  return (
    <View style={[styles.base, styles.same]}>
      <Text style={[styles.text, styles.sameText]}>—</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
  up:       { backgroundColor: 'rgba(76,175,80,0.2)' },
  upText:   { color: colors.correct },
  down:     { backgroundColor: 'rgba(244,67,54,0.2)' },
  downText: { color: colors.incorrect },
  same:     { backgroundColor: colors.bgCard },
  sameText: { color: colors.textMuted },
  new:      { backgroundColor: `${colors.primary}30` },
  newText:  { color: colors.primaryLight },
})
