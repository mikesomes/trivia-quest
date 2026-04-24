import React from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, radius } from '../../constants/theme'

interface GradientCardProps {
  children: React.ReactNode
  accentColor?: string
  style?: ViewStyle
  contentStyle?: ViewStyle
}

/**
 * A card with a subtle top-edge gradient accent.
 * The gradient fades from the accent color down to transparent over ~80px,
 * sitting on top of the standard card background.
 */
export function GradientCard({
  children,
  accentColor = colors.primary,
  style,
  contentStyle,
}: GradientCardProps) {
  return (
    <View style={[styles.card, style]}>
      {/* Top gradient glow */}
      <LinearGradient
        colors={[`${accentColor}28`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      {/* Top accent line */}
      <LinearGradient
        colors={['transparent', `${accentColor}99`, 'transparent']}
        style={styles.topLine}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        pointerEvents="none"
      />
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  content: {
    flex: 1,
  },
})
