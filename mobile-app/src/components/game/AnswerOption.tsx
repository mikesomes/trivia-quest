import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text, StyleSheet, View } from 'react-native'
import type { AnswerOption as AnswerOptionType, AnswerState } from '../../types/game'
import { colors, spacing, radius, fontSize } from '../../constants/theme'
import { haptics } from '../../lib/haptics'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { HammerIcon, ShieldIcon } from '../icons'

type EliminationEffect = 'hammer' | 'shield'

/** How long the server gets to respond before we admit we're waiting. Below
 * this the reveal lands first and no pending state is ever shown. */
const PENDING_HINT_DELAY_MS = 350

interface AnswerOptionProps {
  option: AnswerOptionType
  text: string
  onPress: (option: AnswerOptionType) => void
  answerState: AnswerState
  selectedOption: AnswerOptionType | null
  correctOption?: AnswerOptionType | null
  eliminated?: boolean
  eliminationEffect?: EliminationEffect
  eliminatedIndex?: number
  disabled?: boolean
}

export const AnswerOption = React.memo(function AnswerOption({
  option,
  text,
  onPress,
  answerState,
  selectedOption,
  correctOption,
  eliminated,
  eliminationEffect = 'hammer',
  eliminatedIndex = 0,
  disabled,
}: AnswerOptionProps) {
  const isSelected = selectedOption === option
  const isRevealed = answerState === 'revealed'
  const isPending = answerState === 'pending'
  const isCorrect = isRevealed && option === correctOption
  const isWrong = isRevealed && isSelected && !isCorrect
  const isDisabled = Boolean(disabled) || Boolean(eliminated) || answerState !== 'idle'
  const reducedMotion = useReducedMotion()

  const a11yStatus = eliminated
    ? 'Eliminated'
    : isCorrect
    ? 'Correct answer'
    : isWrong
    ? 'Your answer, incorrect'
    : isSelected
    ? isPending
      ? 'Selected, submitting'
      : 'Selected'
    : ''

  const pulse = useRef(new Animated.Value(1)).current
  const wrongShakeX = useRef(new Animated.Value(0)).current
  // The three unselected options recede the moment a choice is locked in, so
  // the tap visibly changes the whole card rather than just one border.
  const dimOpacity = useRef(new Animated.Value(1)).current
  const pendingSheen = useRef(new Animated.Value(0)).current

  // Elimination animation values
  const strikeY = useRef(new Animated.Value(-64)).current
  const strikeOpacity = useRef(new Animated.Value(0)).current
  const strikeRotate = useRef(new Animated.Value(-40)).current  // degrees
  const shakeX = useRef(new Animated.Value(0)).current
  const eliminatedOpacity = useRef(new Animated.Value(1)).current
  const burstOpacity = useRef(new Animated.Value(0)).current
  const burstScale = useRef(new Animated.Value(0.6)).current

  // Reveal feedback — correct gets a springy pop, wrong gets a horizontal shake
  useEffect(() => {
    if (isCorrect) {
      haptics.correctAnswer()
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, friction: 3.5, tension: 220, useNativeDriver: true }),
      ]).start()
    } else if (isWrong) {
      haptics.wrongAnswer()
      Animated.sequence([
        Animated.timing(wrongShakeX, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(wrongShakeX, { toValue: 8,  duration: 55, useNativeDriver: true }),
        Animated.timing(wrongShakeX, { toValue: -5, duration: 45, useNativeDriver: true }),
        Animated.timing(wrongShakeX, { toValue: 5,  duration: 45, useNativeDriver: true }),
        Animated.timing(wrongShakeX, { toValue: 0,  duration: 35, useNativeDriver: true }),
      ]).start()
    }
  }, [isCorrect, isWrong])

  // Lock-in: everything the player didn't pick steps back immediately, without
  // waiting on the server round trip that decides correct vs wrong.
  useEffect(() => {
    Animated.timing(dimOpacity, {
      toValue: isPending && !isSelected ? 0.45 : 1,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [dimOpacity, isPending, isSelected])

  // A breathing sheen on the locked-in option, but only once the wait becomes
  // noticeable — on a healthy connection this never starts.
  useEffect(() => {
    if (!isSelected || !isPending) {
      pendingSheen.setValue(0)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pendingSheen, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pendingSheen, { toValue: 0.15, duration: 420, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    )

    const timer = setTimeout(() => {
      // Reduced motion still gets the "we're waiting" signal, just held steady.
      if (reducedMotion) pendingSheen.setValue(0.75)
      else loop.start()
    }, PENDING_HINT_DELAY_MS)

    return () => {
      clearTimeout(timer)
      loop.stop()
      pendingSheen.setValue(0)
    }
  }, [isSelected, isPending, pendingSheen, reducedMotion])

  // Hammer smash animation when eliminated
  useEffect(() => {
    if (!eliminated) {
      strikeY.setValue(-64)
      strikeOpacity.setValue(0)
      strikeRotate.setValue(-40)
      shakeX.setValue(0)
      eliminatedOpacity.setValue(1)
      burstOpacity.setValue(0)
      burstScale.setValue(0.6)
      return
    }

    const delayMs = eliminatedIndex * 140
    const timer = setTimeout(() => {
      // Arm the strike indicator above the option
      strikeY.setValue(-64)
      strikeRotate.setValue(-40)
      strikeOpacity.setValue(1)
      burstOpacity.setValue(0)
      burstScale.setValue(0.6)

      // 1. Drive the effect down to impact
      Animated.parallel([
        Animated.timing(strikeY, {
          toValue: 6,
          duration: 170,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(strikeRotate, {
          toValue: eliminationEffect === 'shield' ? -6 : 0,
          duration: 170,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 2. Impact: heavy haptic + shake option
        haptics.eliminationImpact()

        Animated.parallel([
          Animated.sequence([
            Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 10,  duration: 55, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -6,  duration: 45, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 6,   duration: 45, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 0,   duration: 35, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.parallel([
              Animated.timing(burstOpacity, { toValue: 1, duration: 70, useNativeDriver: true }),
              Animated.spring(burstScale, { toValue: eliminationEffect === 'shield' ? 1.22 : 1.35, friction: 4, tension: 220, useNativeDriver: true }),
            ]),
            Animated.timing(burstOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
          ]),
        ]).start()

        // 3. Bounce the effect back up then fade it out
        Animated.sequence([
          Animated.timing(strikeY, {
            toValue: -28,
            duration: 130,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(strikeOpacity, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start()

        // 4. Fade the option to dimmed state after the shake settles
        Animated.timing(eliminatedOpacity, {
          toValue: 0.22,
          duration: 380,
          delay: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start()
      })
    }, delayMs)

    return () => clearTimeout(timer)
  }, [burstOpacity, burstScale, eliminated, eliminatedIndex, eliminatedOpacity, eliminationEffect, shakeX, strikeOpacity, strikeRotate, strikeY])

  // The press scale itself now lives in AnimatedPressable, which springs a
  // Reanimated shared value on the UI thread — it lands before React re-renders.
  const handlePressIn = () => {
    haptics.optionPress()
  }

  const strikeRotateDeg = strikeRotate.interpolate({
    inputRange: [-40, 0],
    outputRange: ['-40deg', '0deg'],
  })

  const burstLabel = eliminationEffect === 'shield' ? 'BLOCK' : 'POW'
  const StrikeMark = eliminationEffect === 'shield' ? ShieldIcon : HammerIcon

  return (
    <View style={styles.wrapper}>
      <Animated.Text
        style={[
          styles.burst,
          {
            opacity: burstOpacity,
            transform: [{ scale: burstScale }],
          },
        ]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {burstLabel}
      </Animated.Text>

      {/* Strike effect — swings down from above the option */}
      <Animated.View
        style={[
          styles.hammerStrike,
          {
            opacity: strikeOpacity,
            transform: [
              { translateY: strikeY },
              { rotate: strikeRotateDeg },
            ],
          },
        ]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <StrikeMark size={38} weight="fill" />
      </Animated.View>

      <AnimatedPressable
        onPress={() => onPress(option)}
        onPressIn={handlePressIn}
        disabled={isDisabled}
        // Sighted players read correct/wrong from the green or red fill and
        // the pop/shake. Screen reader users get nothing from either, so the
        // outcome has to be part of the accessible name and state.
        accessibilityLabel={`Option ${option.toUpperCase()}. ${text}`}
        accessibilityValue={{ text: a11yStatus }}
        accessibilityState={{ selected: isSelected }}
      >
        <Animated.View
          style={[
            styles.option,
            isSelected && !isRevealed && styles.selected,
            isCorrect && styles.correct,
            isWrong && styles.wrong,
            eliminated && styles.eliminatedBorder,
            {
              opacity: eliminated ? eliminatedOpacity : dimOpacity,
              transform: [
                { translateX: Animated.add(shakeX, wrongShakeX) },
                { scale: pulse },
              ],
            },
          ]}
        >
          {/* Painted first so the label and answer text stay on top of it. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pendingSheen,
              { opacity: pendingSheen.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) },
            ]}
          />

          <View style={[
            styles.label,
            !isRevealed && !eliminated && { backgroundColor: OPTION_COLORS[option].bg, borderColor: OPTION_COLORS[option].border },
            isCorrect && styles.labelCorrect,
            isWrong && styles.labelWrong,
            isSelected && !isRevealed && styles.labelSelected,
          ]}>
            <Text style={[styles.labelText, eliminated && styles.labelTextEliminated]}>
              {option.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.text, eliminated && styles.textEliminated]} numberOfLines={3}>
            {text}
          </Text>
          {eliminated && (
            <View pointerEvents="none" style={styles.knockedOutPill}>
              <Text style={styles.knockedOutText}>OUT</Text>
            </View>
          )}
        </Animated.View>
      </AnimatedPressable>
    </View>
  )
})

const OPTION_COLORS: Record<string, { bg: string; border: string }> = {
  a: { bg: '#1e3a5f', border: '#2e5a8f' },  // blue
  b: { bg: '#2e1f5e', border: '#4a3490' },  // purple
  c: { bg: '#0f3d3d', border: '#1a6060' },  // teal
  d: { bg: '#3d2a0a', border: '#7a5214' },  // amber
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
    minHeight: 60,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}22`,
  },
  pendingSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  correct: {
    borderColor: colors.correct,
    backgroundColor: colors.correctBg,
  },
  wrong: {
    borderColor: colors.incorrect,
    backgroundColor: colors.incorrectBg,
  },
  eliminatedBorder: {
    borderColor: colors.incorrect,
    backgroundColor: colors.incorrectBg,
  },
  label: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bgCardAlt,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  labelSelected: { backgroundColor: colors.primary },
  labelCorrect: { backgroundColor: colors.correct },
  labelWrong: { backgroundColor: colors.incorrect },
  labelText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  labelTextEliminated: {
    textDecorationLine: 'line-through',
  },
  text: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  textEliminated: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  hammerStrike: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    fontSize: 36,
    zIndex: 12,
  },
  burst: {
    position: 'absolute',
    right: spacing.lg,
    top: -8,
    zIndex: 11,
    color: colors.incorrect,
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 0,
  },
  knockedOutPill: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.incorrect,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  knockedOutText: {
    color: colors.textOnAccent,
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 0,
  },
})
