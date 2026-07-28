import React from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { motion } from '../../constants/theme'

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable)

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
  /** Scale to spring to on press-in. Defaults to 0.97 — the app-wide press feel. */
  scaleTo?: number
  /** Opacity to spring to on press-in, for parity with the old TouchableOpacity activeOpacity. Defaults to 1 (no dimming). */
  activeOpacity?: number
}

/** Drop-in replacement for TouchableOpacity: springs to `scaleTo` (and optionally
 * `activeOpacity`) on press so every touchable in the app shares one press feel. */
export function AnimatedPressable({
  style,
  children,
  scaleTo = 0.97,
  activeOpacity = 1,
  disabled,
  ...pressableProps
}: Props) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <AnimatedPressableBase
      // animatedStyle first so a static `disabled && { opacity: ... }` in `style`
      // always wins over the transient press opacity/scale.
      style={[animatedStyle, style]}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, motion.reanimatedSpringSnappy)
        opacity.value = withSpring(activeOpacity, motion.reanimatedSpringSnappy)
        pressableProps.onPressIn?.(e)
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.reanimatedSpringSnappy)
        opacity.value = withSpring(1, motion.reanimatedSpringSnappy)
        pressableProps.onPressOut?.(e)
      }}
      {...pressableProps}
    >
      {children}
    </AnimatedPressableBase>
  )
}
