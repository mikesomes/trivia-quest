import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

interface Props {
  active?: boolean
  children: React.ReactNode
  scale?: number
  durationMs?: number
}

/** Loops a gentle breathing scale while `active`, inviting a tap. */
export function Pulse({ active = true, children, scale = 1.04, durationMs = 900 }: Props) {
  const value = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!active) {
      value.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: scale, duration: durationMs, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: durationMs, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [active, scale, durationMs, value])

  // The pulse itself carries no meaning — whatever it wraps stays announced.
  return (
    <Animated.View style={{ transform: [{ scale: value }] }}>
      {children}
    </Animated.View>
  )
}
