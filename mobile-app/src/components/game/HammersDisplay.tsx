import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { spacing } from '../../constants/theme'
import { GAME_CONFIG } from '../../constants/game'

interface HammersDisplayProps {
  hammers: number
  onUse?: () => void
  canUse?: boolean
}

export function HammersDisplay({ hammers, onUse, canUse }: HammersDisplayProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onUse}
      disabled={!canUse}
      activeOpacity={0.7}
    >
      {Array.from({ length: GAME_CONFIG.MAX_HAMMERS }, (_, i) => (
        <Text
          key={i}
          style={[styles.hammer, i < hammers ? styles.active : styles.empty]}
        >
          🔨
        </Text>
      ))}
    </TouchableOpacity>
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
