import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { colors, spacing, fontSize, radius } from '../../constants/theme'
import { GAME_CONFIG } from '../../constants/game'

interface TimerBarProps {
  timeRemainingMs: number
  isPaused: boolean
  totalMs?: number
}

export function TimerBar({ timeRemainingMs, isPaused, totalMs = GAME_CONFIG.TIMER_SECONDS * 1000 }: TimerBarProps) {
  const progress = Math.max(0, timeRemainingMs / totalMs)
  const secondsLeft = Math.ceil(timeRemainingMs / 1000)
  const isUrgent = timeRemainingMs <= 5000 && timeRemainingMs > 0

  const timerColor =
    progress > 0.4
      ? colors.timerNormal
      : progress > 0.2
      ? colors.timerWarning
      : colors.timerDanger

  const pulseAnim = useRef(new Animated.Value(1)).current
  const loopRef = useRef<Animated.CompositeAnimation | null>(null)
  const firedThresholds = useRef(new Set<number>())

  // Escalating haptic pulses — gaps shrink as time runs out
  const HAPTIC_THRESHOLDS: Array<{ ms: number; style: Haptics.ImpactFeedbackStyle }> = [
    { ms: 5000, style: Haptics.ImpactFeedbackStyle.Light },
    { ms: 4000, style: Haptics.ImpactFeedbackStyle.Light },
    { ms: 3000, style: Haptics.ImpactFeedbackStyle.Light },
    { ms: 2000, style: Haptics.ImpactFeedbackStyle.Medium },
    { ms: 1500, style: Haptics.ImpactFeedbackStyle.Medium },
    { ms: 1000, style: Haptics.ImpactFeedbackStyle.Heavy },
    { ms: 650,  style: Haptics.ImpactFeedbackStyle.Heavy },
    { ms: 300,  style: Haptics.ImpactFeedbackStyle.Heavy },
  ]

  useEffect(() => {
    if (!isUrgent || isPaused) return
    for (const { ms, style } of HAPTIC_THRESHOLDS) {
      if (timeRemainingMs <= ms && !firedThresholds.current.has(ms)) {
        firedThresholds.current.add(ms)
        Haptics.impactAsync(style)
      }
    }
  }, [timeRemainingMs, isUrgent, isPaused])

  // Reset fired thresholds when a new question starts
  useEffect(() => {
    if (!isUrgent) firedThresholds.current.clear()
  }, [isUrgent])

  useEffect(() => {
    if (isUrgent && !isPaused) {
      // Pulse faster as the clock runs down
      const cycleDuration = timeRemainingMs < 2000 ? 280 : timeRemainingMs < 3500 ? 380 : 500

      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: cycleDuration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: cycleDuration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
      loopRef.current.start()
    } else {
      loopRef.current?.stop()
      loopRef.current = null
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start()
    }

    return () => {
      loopRef.current?.stop()
    }
  }, [isUrgent, isPaused, timeRemainingMs < 2000, timeRemainingMs < 3500])

  // Fill dims while label grows — inverse throb
  const labelScale = pulseAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [1.3, 1],
  })

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: `${progress * 100}%` as any,
              backgroundColor: timerColor,
              opacity: pulseAnim,
            },
          ]}
        />
      </View>
      <Animated.Text
        style={[
          styles.label,
          { color: timerColor, transform: [{ scale: labelScale }] },
        ]}
      >
        {secondsLeft}s
      </Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
})
