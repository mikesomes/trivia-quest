import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { haptics } from '../../lib/haptics'
import { StarIcon } from '../icons'

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
      haptics.punch()
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
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <StarIcon size={size} weight="fill" />
    </Animated.View>
  )
}

export function StarRating({ stars, maxStars = 3, size = 14, animated = false }: Props) {
  if (!animated) {
    return (
      <View style={styles.row}>
        {Array.from({ length: maxStars }, (_, i) => (
          <View key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>
            <StarIcon size={size} weight="fill" />
          </View>
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
