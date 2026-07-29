import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { GameIcon, type GameIconName } from '../icons'

export interface StreakMilestone {
  streak: number
  icon: GameIconName
  label: string
  color: string
  /** Increments each trigger so React re-mounts even for the same streak */
  key: number
}

export const STREAK_MILESTONES: Record<number, Omit<StreakMilestone, 'key'>> = {
  3:  { streak: 3,  icon: 'flame' as GameIconName, label: 'Heating up',   color: colors.timerWarning },
  6:  { streak: 6,  icon: 'xp' as GameIconName, label: 'On fire',       color: '#FFE033' },
  10: { streak: 10, icon: 'crown' as GameIconName, label: 'UNSTOPPABLE',  color: colors.gold },
}

interface Props {
  icon: GameIconName
  label: string
  color: string
  onDone: () => void
}

export function StreakMilestoneToast({ icon, label, color, onDone }: Props) {
  const scale   = useRef(new Animated.Value(0.5)).current
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(12)).current

  useEffect(() => {
    Animated.sequence([
      // Pop in
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 260,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Hold
      Animated.delay(1300),
      // Fade + float out upward
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) onDone()
    })
  }, [])

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.card,
        {
          borderColor: color,
          shadowColor: color,
          transform: [{ scale }, { translateY }],
          opacity,
        },
      ]}
    >
      <GameIcon name={icon} size={30} color={color} />
      <View style={styles.textBlock}>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(15, 15, 26, 0.92)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    // iOS glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
  textBlock: {
    gap: 1,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
