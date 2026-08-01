import React from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { colors, radius } from '../../constants/theme'

interface ProgressBarProps {
  progress: number // 0-1
  color?: string
  height?: number
  /** Defaults to `colors.border`. Use `edges.track` on layered surfaces. */
  trackColor?: string
  style?: ViewStyle
}

export function ProgressBar({
  progress,
  color = colors.primary,
  height = 6,
  trackColor = colors.border,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress))
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
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
    borderRadius: radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radius.full,
  },
})
