import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { colors, fontSize } from '../../constants/theme'
import type { AnswerXpBreakdown } from '../../types/game'

interface Props {
  xpGained: number
  breakdown?: AnswerXpBreakdown
}

function FloatingLabel({ text, color, delay, size = fontSize.md }: { text: string; color: string; delay: number; size?: number }) {
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: -56,
          duration: 920,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <Animated.Text
      style={[styles.label, { color, fontSize: size, opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      {text}
    </Animated.Text>
  )
}

export function FloatingXpPopup({ xpGained, breakdown }: Props) {
  const difficultyLabel = breakdown && breakdown.difficultyBonus > 0
    ? `+${breakdown.difficultyBonus} difficulty`
    : null
  const streakLabel = breakdown && breakdown.streakBonus > 0
    ? `+${breakdown.streakBonus} streak ${breakdown.comboMultiplier.toFixed(1)}x`
    : null

  return (
    <View style={styles.container} pointerEvents="none">
      <FloatingLabel text={`+${xpGained} XP`} color={colors.primary} delay={0} size={fontSize.lg} />
      {breakdown && breakdown.timeBonus > 0 && (
        <FloatingLabel text={`+${breakdown.timeBonus} speed`} color={colors.streakActive} delay={150} />
      )}
      {difficultyLabel && (
        <FloatingLabel text={difficultyLabel} color={colors.textPrimary} delay={300} />
      )}
      {streakLabel && (
        <FloatingLabel text={streakLabel} color={colors.streakActive} delay={450} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
})
