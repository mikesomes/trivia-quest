import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Modal, StyleSheet, Text } from 'react-native'
import { colors, fontSize, spacing } from '../../constants/theme'
import { HammerIcon } from '../icons'

interface Props {
  visible: boolean
  onDismiss: () => void
}

export function HammerEarnedOverlay({ visible, onDismiss }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const hammerScale = useRef(new Animated.Value(0)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textTranslateY = useRef(new Animated.Value(16)).current

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0)
      hammerScale.setValue(0)
      textOpacity.setValue(0)
      textTranslateY.setValue(16)
      return
    }

    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()

    Animated.spring(hammerScale, {
      toValue: 1,
      tension: 60,
      friction: 5,
      useNativeDriver: true,
    }).start()

    Animated.sequence([
      Animated.delay(220),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start()

    const timer = setTimeout(() => {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
        .start(() => onDismiss())
    }, 1800)

    return () => clearTimeout(timer)
  }, [onDismiss, visible])

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
        <Animated.Text style={[styles.hammer, { transform: [{ scale: hammerScale }] }]}>
          <HammerIcon size={44} />
        </Animated.Text>
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
          <Text style={styles.title}>HAMMER!</Text>
          <Text style={styles.subtitle}>Eliminate 2 wrong answers</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  hammer: {
    fontSize: 96,
    lineHeight: 112,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(255,215,0,0.5)',
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
