import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Modal, StyleSheet, Text, TouchableWithoutFeedback } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'

const MESSAGES = [
  { emoji: '🧠', title: 'Big Brain Energy', body: "You tapped a greeting seven times.\nWe respect the curiosity." },
  { emoji: '☕', title: 'Developer Secret', body: "This app was built on coffee,\nquestionable decisions, and vibes." },
  { emoji: '🎯', title: 'Pro Tip', body: "The answer is usually B.\n(Please don't actually use this strategy.)" },
  { emoji: '🦄', title: 'You Found the Unicorn', body: "Unfortunately it's just a\ntext message. Sorry." },
  { emoji: '🕵️', title: 'Secret Agent', body: "You have the instincts of someone\nwho reads every EULA. Rare." },
  { emoji: '💡', title: 'Fun Fact', body: "The average person blinks 15 times\na minute. You blinked at least twice\nreading this." },
]

interface Props {
  visible: boolean
  onDismiss: () => void
}

export function EasterEggModal({ visible, onDismiss }: Props) {
  const messageIndex = useRef(Math.floor(Math.random() * MESSAGES.length))
  const message = MESSAGES[messageIndex.current]
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const cardScale = useRef(new Animated.Value(0.5)).current
  const cardOpacity = useRef(new Animated.Value(0)).current
  const emojiRotate = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0)
      cardScale.setValue(0.5)
      cardOpacity.setValue(0)
      emojiRotate.setValue(0)
      messageIndex.current = Math.floor(Math.random() * MESSAGES.length)
      return
    }

    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()

    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(emojiRotate, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(emojiRotate, { toValue: -1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(emojiRotate, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(800),
      ])
    ).start()
  }, [visible])

  const rotateDeg = emojiRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-18deg', '0deg', '18deg'],
  })

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
              <Animated.Text style={[styles.emoji, { transform: [{ rotate: rotateDeg }] }]}>
                {message.emoji}
              </Animated.Text>
              <Text style={styles.title}>{message.title}</Text>
              <Text style={styles.body}>{message.body}</Text>
              <Text style={styles.hint}>tap anywhere to close</Text>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  emoji: {
    fontSize: 64,
    lineHeight: 76,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
})
