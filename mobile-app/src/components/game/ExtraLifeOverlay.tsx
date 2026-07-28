import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, spacing } from '../../constants/theme'
import { LifeIcon } from '../icons'

interface Props {
  visible: boolean
  onDismiss: () => void
}

const PARTICLE_COUNT = 10
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (i * 360) / PARTICLE_COUNT)

function HeartParticle({ angle, trigger }: { angle: number; trigger: boolean }) {
  const distance = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!trigger) return
    distance.setValue(0)
    opacity.setValue(0)
    Animated.parallel([
      Animated.timing(distance, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start()
  }, [trigger])

  const rad = (angle * Math.PI) / 180
  const maxDist = 130
  const translateX = distance.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * maxDist] })
  const translateY = distance.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * maxDist] })

  return (
    <Animated.View style={[styles.particle, { opacity, transform: [{ translateX }, { translateY }] }]}>
      <LifeIcon size={20} weight="fill" />
    </Animated.View>
  )
}

export function ExtraLifeOverlay({ visible, onDismiss }: Props) {
  const flashOpacity = useRef(new Animated.Value(0)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const heartScale = useRef(new Animated.Value(0)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textTranslateY = useRef(new Animated.Value(16)).current
  const [particleTrigger, setParticleTrigger] = React.useState(false)

  useEffect(() => {
    if (!visible) {
      flashOpacity.setValue(0)
      overlayOpacity.setValue(0)
      heartScale.setValue(0)
      textOpacity.setValue(0)
      textTranslateY.setValue(16)
      setParticleTrigger(false)
      return
    }

    setParticleTrigger(true)

    // 1. Background flash (red pulse)
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.45, duration: 120, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()

    // 2. Dark overlay fades in
    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()

    // 3. Heart springs in with bounce
    Animated.spring(heartScale, {
      toValue: 1,
      tension: 60,
      friction: 5,
      useNativeDriver: true,
    }).start()

    // 4. "EXTRA LIFE!" text slides up and fades in after heart lands
    Animated.sequence([
      Animated.delay(220),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start()

    // 5. Auto-dismiss: fade everything out then call onDismiss
    const timer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDismiss())
    }, 1800)

    return () => clearTimeout(timer)
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {/* Red flash layer */}
      <Animated.View
        style={[styles.flash, { opacity: flashOpacity }]}
        pointerEvents="none"
      />

      {/* Main overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
        {/* Particle burst */}
        <View style={styles.particleOrigin} pointerEvents="none">
          {PARTICLE_ANGLES.map((angle) => (
            <HeartParticle key={angle} angle={angle} trigger={particleTrigger} />
          ))}
        </View>

        {/* Heart */}
        <Animated.View style={[styles.heart, { transform: [{ scale: heartScale }] }]}>
          <LifeIcon size={96} weight="fill" />
        </Animated.View>

        {/* Text */}
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
          <Text style={styles.title}>EXTRA LIFE!</Text>
          <Text style={styles.subtitle}>5 in a row</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.lifeActive,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  particleOrigin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
  heart: {
    shadowColor: colors.lifeActive,
    shadowOpacity: 0.9,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '900',
    color: colors.lifeActive,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(244,67,54,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})
