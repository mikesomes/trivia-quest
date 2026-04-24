import React from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { colors, radius } from '../../constants/theme'

interface ProgressBarProps {
  progress: number // 0-1
  color?: string
  height?: number
  style?: ViewStyle
}

export function ProgressBar({ progress, color = colors.primary, height = 6, style }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress))
  return (
    <View style={[styles.track, { height }, style]}>
      <View
        style={[
          styles.fill,
          { width: `${clampedProgress * 100}%`, backgroundColor: color, height },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radius.full,
  },
})
