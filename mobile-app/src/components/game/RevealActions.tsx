import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { colors, spacing, fontSize } from '../../constants/theme'
import type { AnswerResult } from '../../types/game'

interface Props {
  pendingResult: AnswerResult | null
  isSuddenDeath: boolean
  flagged: boolean
  onNext: () => void
  onToggleFlag: () => void
}

/** Explanation card + Next/Flag actions shown once an answer is revealed. */
export function RevealActions({ pendingResult, isSuddenDeath, flagged, onNext, onToggleFlag }: Props) {
  if (!pendingResult) return null

  return (
    <>
      {!pendingResult.isCorrect && pendingResult.explanation && (
        <View style={styles.explanation}>
          <Text style={styles.explanationLabel}>Did you know?</Text>
          <Text style={styles.explanationText}>{pendingResult.explanation}</Text>
        </View>
      )}

      <AnimatedPressable
        style={[
          styles.nextButton,
          pendingResult.isCorrect ? styles.nextButtonCorrect : styles.nextButtonIncorrect,
        ]}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={styles.nextButtonText}>
          {pendingResult.isRoundOver
            ? pendingResult.livesRemaining === 0
              ? 'Game Over'
              : isSuddenDeath ? 'Keep Going →' : 'See Results'
            : 'Next Question →'}
        </Text>
      </AnimatedPressable>

      <AnimatedPressable style={styles.flagButton} onPress={onToggleFlag} activeOpacity={0.6}>
        <Text style={[styles.flagText, flagged && styles.flagTextDone]}>
          {flagged ? '🚩 Flagged — tap to unflag' : '🚩 Flag question'}
        </Text>
      </AnimatedPressable>
    </>
  )
}

const styles = StyleSheet.create({
  nextButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonCorrect: {
    backgroundColor: colors.correct,
  },
  nextButtonIncorrect: {
    backgroundColor: colors.primary,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  explanation: {
    backgroundColor: colors.incorrectBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.incorrect,
    padding: spacing.md,
    gap: spacing.xs,
  },
  explanationLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.incorrect,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  explanationText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  flagButton: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  flagText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    opacity: 0.6,
  },
  flagTextDone: {
    opacity: 1,
    color: colors.incorrect,
  },
})
