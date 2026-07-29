import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius } from '../../constants/theme'
import type { RankMovement } from '../../utils/leaderboard'
import { AppIcon } from '../ui/AppIcon'

interface Props {
  movement: RankMovement
}

/**
 * Rank change since the last leaderboard snapshot.
 *
 * Direction is carried by the caret's shape, the delta number, and the
 * accessibility label — not by color alone, so it survives a colorblind reader
 * and a screen reader equally.
 */
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
      <View style={[styles.base, styles.up]} accessible accessibilityLabel={`Up ${movement.delta}`}>
        <AppIcon name="rankUp" size={10} />
        <Text style={[styles.text, styles.upText]}>{movement.delta}</Text>
      </View>
    )
  }
  if (movement.direction === 'down') {
    return (
      <View style={[styles.base, styles.down]} accessible accessibilityLabel={`Down ${movement.delta}`}>
        <AppIcon name="rankDown" size={10} />
        <Text style={[styles.text, styles.downText]}>{movement.delta}</Text>
      </View>
    )
  }
  return (
    <View style={[styles.base, styles.same]} accessible accessibilityLabel="No change">
      <AppIcon name="rankSame" size={10} />
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
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
  new:      { backgroundColor: `${colors.primary}30` },
  newText:  { color: colors.primaryLight },
})
