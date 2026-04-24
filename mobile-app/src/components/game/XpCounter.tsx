import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAudioPlayer } from 'expo-audio'
import { colors, fontSize, spacing } from '../../constants/theme'
import { formatNumber } from '../../utils/format'

const COUNT_DURATION_MS = 2000
const TICK_INTERVAL_MS = 60
const LAUNCH_DELAY_MS = 350

interface Props {
  finalXp: number
  onLanded?: () => void
}

export function XpCounter({ finalXp, onLanded }: Props) {
  const [displayXp, setDisplayXp] = useState(0)
  const [landed, setLanded] = useState(false)

  const scale = useRef(new Animated.Value(0.5)).current
  const glowScale = useRef(new Animated.Value(0.3)).current
  const glowOpacity = useRef(new Animated.Value(0)).current
  const landingScale = useRef(new Animated.Value(1)).current
  const landingGlow = useRef(new Animated.Value(0)).current

  const tickPlayer = useAudioPlayer(require('../../../assets/sounds/xp-tick.wav'))

  useEffect(() => {
    if (finalXp === 0) {
      setDisplayXp(0)
      setLanded(true)
      return
    }

    const startTime = Date.now() + LAUNCH_DELAY_MS
    let lastTickTime = 0
    let animFrame: ReturnType<typeof setTimeout>

    setTimeout(() => {
      Animated.timing(scale, {
        toValue: 1,
        duration: COUNT_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()

      Animated.parallel([
        Animated.timing(glowScale, {
          toValue: 1,
          duration: COUNT_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: COUNT_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start()
    }, LAUNCH_DELAY_MS)

    function tick() {
      const now = Date.now()
      const elapsed = Math.max(0, now - startTime)
      const t = Math.min(elapsed / COUNT_DURATION_MS, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(eased * finalXp)

      setDisplayXp(current)

      if (now - lastTickTime > TICK_INTERVAL_MS && t < 1) {
        lastTickTime = now
        try {
          tickPlayer.seekTo(0)
          tickPlayer.volume = 0.3
          tickPlayer.play()
        } catch {}
      }

      if (t < 1) {
        animFrame = setTimeout(tick, 16)
      } else {
        setDisplayXp(finalXp)
        land()
      }
    }

    const launchTimeout = setTimeout(tick, LAUNCH_DELAY_MS)

    function land() {
      setLanded(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      Animated.sequence([
        Animated.timing(landingScale, {
          toValue: 1.18,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(landingScale, {
          toValue: 1,
          friction: 4,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start()

      Animated.sequence([
        Animated.timing(landingGlow, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(landingGlow, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start()

      Animated.timing(glowOpacity, {
        toValue: 0.25,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()

      onLanded?.()
    }

    return () => {
      clearTimeout(launchTimeout)
      clearTimeout(animFrame)
    }
  }, [finalXp])

  const xpColor = landed ? colors.streakActive : colors.textPrimary
  const labelColor = landed ? `${colors.streakActive}99` : colors.textSecondary
  const primaryGlowColor = landed ? `${colors.streakActive}` : colors.primary

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: primaryGlowColor,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
        pointerEvents="none"
      />

      <Animated.View
        style={[
          styles.landingFlare,
          { opacity: landingGlow },
        ]}
        pointerEvents="none"
      />

      <Animated.Text
        style={[
          styles.xp,
          {
            color: xpColor,
            transform: [
              { scale: Animated.multiply(scale, landingScale) },
            ],
          },
        ]}
      >
        {formatNumber(displayXp)}
      </Animated.Text>

      <Text style={[styles.label, { color: labelColor }]}>
        {landed ? 'XP earned' : 'XP'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    alignSelf: 'center',
  },
  landingFlare: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.streakActive,
    alignSelf: 'center',
  },
  xp: {
    fontSize: 76,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0,
  },
})
