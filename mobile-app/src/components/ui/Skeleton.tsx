import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native'
import { colors, radius, spacing, surfaces } from '../../constants/theme'
import { useReducedMotion } from '../../hooks/useReducedMotion'

// Placeholders for content that is still loading. Prefer these over a spinner
// whenever the shape of what's arriving is known: a skeleton that matches the
// final layout means content doesn't reflow when it lands, and the screen never
// looks empty. A spinner is still the right call for an action in flight (a
// button mid-mutation), where there is no layout to preview.

/** Shared pulse. One driver per skeleton tree keeps the shimmer in sync. */
function usePulse() {
  const opacity = useRef(new Animated.Value(0.4)).current
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(0.65)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity, reducedMotion])

  return opacity
}

interface SkeletonProps {
  /** Announced once for the whole loading region, e.g. "Loading your profile". */
  label?: string
  style?: ViewStyle
  children: React.ReactNode
}

/**
 * Wraps a group of placeholder shapes, pulsing them together and presenting the
 * group to screen readers as a single "loading" element rather than a pile of
 * anonymous boxes.
 */
export function Skeleton({ label = 'Loading', style, children }: SkeletonProps) {
  const opacity = usePulse()
  return (
    <Animated.View
      style={[style, { opacity }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      {children}
    </Animated.View>
  )
}

/** A solid block — image, tile, badge. */
export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: {
  width?: DimensionValue
  height?: DimensionValue
  borderRadius?: number
  style?: ViewStyle
}) {
  return <View style={[styles.shape, { width, height, borderRadius }, style]} />
}

/** A circle — avatar, coin, node marker. */
export function SkeletonCircle({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <View style={[styles.shape, { width: size, height: size, borderRadius: size / 2 }, style]} />
}

/**
 * Stacked text bars. The last line is short so the block reads as a paragraph
 * rather than a solid slab.
 */
export function SkeletonText({
  lines = 2,
  lineHeight = 12,
  gap = 8,
  width = '100%',
  lastLineWidth = '60%',
  style,
}: {
  lines?: number
  lineHeight?: number
  gap?: number
  width?: DimensionValue
  lastLineWidth?: DimensionValue
  style?: ViewStyle
}) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBox
          key={i}
          height={lineHeight}
          width={i === lines - 1 && lines > 1 ? lastLineWidth : width}
          borderRadius={4}
        />
      ))}
    </View>
  )
}

/** Card-shaped placeholder matching the app's standard content card. */
export function SkeletonCard({
  height = 96,
  label = 'Loading',
}: {
  height?: number
  label?: string
}) {
  return (
    <Skeleton label={label} style={StyleSheet.flatten([styles.card, { height }])}>
      <SkeletonBox width="45%" height={13} />
      <SkeletonText lines={2} lineHeight={10} width="90%" lastLineWidth="55%" />
    </Skeleton>
  )
}

const styles = StyleSheet.create({
  shape: {
    backgroundColor: surfaces.surface2,
  },
  card: {
    backgroundColor: surfaces.surface1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
})
