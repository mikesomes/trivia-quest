import React, { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, Modal, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import ConfettiCannon from 'react-native-confetti-cannon'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { CHEST_TIER_META, CHEST_REWARD_META } from '../../constants/chest'
import type { ChestReward, ChestTier } from '../../api/dailyReward'

interface Props {
  visible: boolean
  tier: ChestTier
  reward: ChestReward | null
  onDismiss: () => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export function ChestOpenModal({ visible, tier, reward, onDismiss }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const shake = useRef(new Animated.Value(0)).current
  const chestScale = useRef(new Animated.Value(1)).current
  const chestOpacity = useRef(new Animated.Value(1)).current
  const rewardScale = useRef(new Animated.Value(0)).current
  const rewardOpacity = useRef(new Animated.Value(0)).current
  const confettiRef = useRef<ConfettiCannon>(null)
  const [revealed, setRevealed] = useState(false)

  const chime = useAudioPlayer(require('../../../assets/sounds/extra-life.mp3'))

  const tierMeta = CHEST_TIER_META[tier]
  const rewardMeta = reward ? CHEST_REWARD_META[reward.type] : null

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0)
      shake.setValue(0)
      chestScale.setValue(1)
      chestOpacity.setValue(1)
      rewardScale.setValue(0)
      rewardOpacity.setValue(0)
      setRevealed(false)
      return
    }

    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    setRevealed(false)

    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const shakeAnim = Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -0.6, duration: 70, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
    ])

    shakeAnim.start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      confettiRef.current?.start()
      try { chime.seekTo(0); chime.play() } catch {}
      setRevealed(true)

      Animated.parallel([
        Animated.timing(chestScale, { toValue: 1.4, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(chestOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.spring(rewardScale, { toValue: 1, tension: 90, friction: 6, delay: 100, useNativeDriver: true }),
        Animated.timing(rewardOpacity, { toValue: 1, duration: 250, delay: 100, useNativeDriver: true }),
      ]).start()
    })

    const dismissTimer = setTimeout(onDismiss, 3400)
    return () => clearTimeout(dismissTimer)
  }, [visible])

  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] })

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <View style={styles.stage} pointerEvents="none">
            {!revealed && (
              <Animated.Text
                style={[
                  styles.chestEmoji,
                  { transform: [{ rotate }, { scale: chestScale }], opacity: chestOpacity },
                ]}
              >
                {tierMeta.emoji}
              </Animated.Text>
            )}

            {revealed && reward && rewardMeta && (
              <Animated.View
                style={[
                  styles.rewardCard,
                  { borderColor: `${tierMeta.color}88`, opacity: rewardOpacity, transform: [{ scale: rewardScale }] },
                ]}
              >
                <Text style={[styles.tierLabel, { color: tierMeta.color }]}>{tierMeta.label}</Text>
                <Text style={styles.rewardEmoji}>{rewardMeta.emoji}</Text>
                <Text style={styles.rewardLabel}>{rewardMeta.label(reward.amount)}</Text>
                <Text style={styles.hint}>Tap to continue</Text>
              </Animated.View>
            )}
          </View>

          <ConfettiCannon
            ref={confettiRef}
            count={40}
            origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
            autoStart={false}
            fadeOut
            explosionSpeed={220}
            fallSpeed={3200}
            colors={[tierMeta.color, colors.primary, '#ffffff']}
          />
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
  },
  chestEmoji: {
    fontSize: 96,
  },
  rewardCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    borderWidth: 1.5,
    borderRadius: radius.xl,
    backgroundColor: colors.bgCard,
  },
  tierLabel: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  rewardEmoji: {
    fontSize: 56,
    marginVertical: spacing.xs,
  },
  rewardLabel: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    letterSpacing: 1,
  },
})
