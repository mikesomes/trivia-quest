import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import * as Haptics from 'expo-haptics'

interface Props {
  stars: number
  maxStars?: number
  size?: number
  /** Punch each earned star in with a haptic tick, staggered by index. */
  animated?: boolean
}

function AnimatedStar({ filled, size, delay }: { filled: boolean; size: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0.2)).current
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!filled) return
    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.4, tension: 200, friction: 4, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
        ]),
      ]).start()
    }, delay)
    return () => clearTimeout(timer)
  }, [filled, delay, opacity, scale])

  return (
    <Animated.Text style={{ fontSize: size, opacity, transform: [{ scale }] }}>⭐</Animated.Text>
  )
}

export function StarRating({ stars, maxStars = 3, size = 14, animated = false }: Props) {
  if (!animated) {
    return (
      <View style={styles.row}>
        {Array.from({ length: maxStars }, (_, i) => (
          <Text key={i} style={{ fontSize: size, opacity: i < stars ? 1 : 0.2 }}>⭐</Text>
        ))}
      </View>
    )
  }

  return (
    <View style={styles.row}>
      {Array.from({ length: maxStars }, (_, i) => (
        <AnimatedStar key={i} filled={i < stars} size={size} delay={i * 180} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
})
