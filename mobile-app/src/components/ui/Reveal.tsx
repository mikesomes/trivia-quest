import React, { useEffect, useRef } from 'react'
import { Animated, type ViewStyle } from 'react-native'

interface Props {
  children: React.ReactNode
  delay?: number
  style?: ViewStyle
}

/** Fades and slides content up on mount. Stack a few of these with increasing
 * `delay` to give a screen a choreographed, cascading reveal. */
export function Reveal({ children, delay = 0, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(16)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start()
    }, delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  )
}
