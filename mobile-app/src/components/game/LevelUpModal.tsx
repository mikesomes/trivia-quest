import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Modal, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import { colors, fontSize, spacing } from '../../constants/theme'

interface Props {
  visible: boolean
  newLevel: number
  onDismiss: () => void
}

// Eight particles, evenly spread around 360°
const PARTICLE_COUNT = 8
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (i * 360) / PARTICLE_COUNT)
const PARTICLE_EMOJIS = ['⭐', '✨', '🌟', '💫', '⭐', '✨', '🌟', '💫']

function Particle({ angle, trigger }: { angle: number; trigger: boolean }) {
  const distance = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!trigger) return
    distance.setValue(0)
    opacity.setValue(0)
    Animated.parallel([
      Animated.timing(distance, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.delay(500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start()
  }, [trigger])

  const rad = (angle * Math.PI) / 180
  const maxDist = 110
  const translateX = distance.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * maxDist] })
  const translateY = distance.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * maxDist] })

  return (
    <Animated.Text style={[styles.particle, { opacity, transform: [{ translateX }, { translateY }] }]}>
      {PARTICLE_EMOJIS[PARTICLE_ANGLES.indexOf(angle) % PARTICLE_EMOJIS.length]}
    </Animated.Text>
  )
}

export function LevelUpModal({ visible, newLevel, onDismiss }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const cardScale = useRef(new Animated.Value(0.4)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current
  const [particleTrigger, setParticleTrigger] = React.useState(false)

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0)
      cardScale.setValue(0.4)
      cardOpacity.setValue(0)
      pulse.setValue(1)
      setParticleTrigger(false)
      return
    }

    setParticleTrigger(true)

    // Overlay fade in
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start()

    // Card spring pop
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 80,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Pulse ring loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()

    // Auto-dismiss after 2.8s
    const timer = setTimeout(onDismiss, 2800)
    return () => clearTimeout(timer)
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          {/* Particles */}
          <View style={styles.particleOrigin} pointerEvents="none">
            {PARTICLE_ANGLES.map((angle) => (
              <Particle key={angle} angle={angle} trigger={particleTrigger} />
            ))}
          </View>

          {/* Card */}
          <Animated.View
            style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}
          >
            {/* Pulse ring */}
            <Animated.View style={[styles.ring, { transform: [{ scale: pulse }] }]} />

            <Text style={styles.levelUpLabel}>LEVEL UP!</Text>
            <Text style={styles.levelNumber}>{newLevel}</Text>
            <Text style={styles.subtitle}>You reached Level {newLevel}!</Text>
            <Text style={styles.hint}>Tap to continue</Text>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const RING_SIZE = 180

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleOrigin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    fontSize: 22,
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.streakActive,
    opacity: 0.35,
  },
  levelUpLabel: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.streakActive,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  levelNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 110,
    textShadowColor: colors.streakActive,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  subtitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    letterSpacing: 1,
  },
})
