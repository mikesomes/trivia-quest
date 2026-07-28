import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Modal, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, fontSize, spacing } from '../../constants/theme'
import { tabularNums } from '../ui/Typography'
import { StarIcon, SparkleIcon } from '../icons'

interface Props {
  visible: boolean
  newLevel: number
  onDismiss: () => void
}

// Eight particles, evenly spread around 360°
const PARTICLE_COUNT = 8
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (i * 360) / PARTICLE_COUNT)
const PARTICLE_MARKS = [StarIcon, SparkleIcon, StarIcon, SparkleIcon, StarIcon, SparkleIcon, StarIcon, SparkleIcon]

// Slowly rotating sunburst behind the card — the "full-screen takeover" feel.
const RAY_COUNT = 12
const RAY_LENGTH = 360

function RadialRays({ trigger }: { trigger: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current
  const rotation = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!trigger) {
      opacity.setValue(0)
      rotation.setValue(0)
      return
    }
    Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    rotation.setValue(0)
    const loop = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [trigger, opacity, rotation])

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <Animated.View
      style={[styles.raysContainer, { opacity, transform: [{ rotate: spin }] }]}
      pointerEvents="none"
    >
      {Array.from({ length: RAY_COUNT }, (_, i) => (
        <View key={i} style={[styles.rayWrap, { transform: [{ rotate: `${(360 / RAY_COUNT) * i}deg` }] }]}>
          <LinearGradient
            colors={['transparent', `${colors.streakActive}66`, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.ray}
          />
        </View>
      ))}
    </Animated.View>
  )
}

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
    <Animated.View style={[styles.particle, { opacity, transform: [{ translateX }, { translateY }] }]}>
      {(() => {
        const Mark = PARTICLE_MARKS[PARTICLE_ANGLES.indexOf(angle) % PARTICLE_MARKS.length]
        return <Mark size={20} weight="fill" />
      })()}
    </Animated.View>
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

    // Auto-dismiss after 3.2s — a touch longer so the rays get a moment to read
    const timer = setTimeout(onDismiss, 3200)
    return () => clearTimeout(timer)
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          {/* Radial rays — sits behind everything else */}
          <RadialRays trigger={visible} />

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
  raysContainer: {
    position: 'absolute',
    width: RAY_LENGTH,
    height: RAY_LENGTH,
  },
  rayWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: RAY_LENGTH,
    height: 4,
    marginLeft: -RAY_LENGTH / 2,
    marginTop: -2,
  },
  ray: {
    width: '100%',
    height: '100%',
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
  levelNumber: { ...tabularNums,
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
