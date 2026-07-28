import React from 'react'
import { Text, StyleSheet, View } from 'react-native'
import { spacing } from '../../constants/theme'
import { GAME_CONFIG } from '../../constants/game'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { HammerIcon } from '../icons'

interface HammersDisplayProps {
  hammers: number
  onUse?: () => void
  canUse?: boolean
}

export function HammersDisplay({ hammers, onUse, canUse }: HammersDisplayProps) {
  return (
    <AnimatedPressable
      style={styles.container}
      onPress={onUse}
      disabled={!canUse}
      activeOpacity={0.7}
    >
      {Array.from({ length: GAME_CONFIG.MAX_HAMMERS }, (_, i) => (
        <View key={i} style={i < hammers ? styles.active : styles.empty}>
          <HammerIcon size={16} weight={i < hammers ? 'fill' : 'regular'} />
        </View>
      ))}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  hammer: {
    fontSize: 20,
  },
  active: {
    opacity: 1,
  },
  empty: {
    opacity: 0.2,
  },
})
