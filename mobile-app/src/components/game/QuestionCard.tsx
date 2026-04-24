import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { Question, AnswerOption, AnswerState, Difficulty } from '../../types/game'
import { AnswerOption as AnswerOptionComponent } from './AnswerOption'
import { colors, spacing, fontSize, radius } from '../../constants/theme'

type EliminationEffect = 'hammer' | 'shield'

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy:   colors.easy,
  medium: colors.medium,
  hard:   colors.hard,
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy:   'Easy',
  medium: 'Medium',
  hard:   'Hard',
}

const XP_MULTIPLIER: Record<Difficulty, string | null> = {
  easy:   null,
  medium: '×1.5 XP',
  hard:   '×2.0 XP',
}

interface QuestionCardProps {
  question: Question
  difficulty?: Difficulty
  answerState: AnswerState
  selectedOption: AnswerOption | null
  correctOption?: AnswerOption | null
  eliminatedOptions?: Partial<Record<AnswerOption, EliminationEffect>>
  onSelectOption: (option: AnswerOption) => void
}

export function QuestionCard({
  question,
  difficulty,
  answerState,
  selectedOption,
  correctOption,
  eliminatedOptions,
  onSelectOption,
}: QuestionCardProps) {
  const options = (['a', 'b', 'c', 'd'] as AnswerOption[])
  const diffColor = difficulty ? DIFFICULTY_COLOR[difficulty] : colors.primary
  const xpMultiplier = difficulty ? XP_MULTIPLIER[difficulty] : null
  const eliminatedOrder = options.filter((opt) => Boolean(eliminatedOptions?.[opt]))

  return (
    <View style={styles.container}>
      {/* Difficulty gradient accent */}
      {diffColor && (
        <LinearGradient
          colors={[`${diffColor}28`, 'transparent']}
          style={styles.gradientAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          pointerEvents="none"
        />
      )}

      {/* Difficulty badge row */}
      {difficulty && (
        <View style={styles.badgeRow}>
          <View style={[styles.diffBadge, { backgroundColor: `${diffColor}22`, borderColor: `${diffColor}55` }]}>
            <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
            <Text style={[styles.diffLabel, { color: diffColor }]}>
              {DIFFICULTY_LABEL[difficulty]}
            </Text>
          </View>
          {xpMultiplier && (
            <View style={[styles.xpBadge, { backgroundColor: `${diffColor}18`, borderColor: `${diffColor}44` }]}>
              <Text style={[styles.xpLabel, { color: diffColor }]}>{xpMultiplier}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.questionText}>{question.questionText}</Text>

      <View style={styles.optionsContainer}>
        {options.map((opt) => {
          const eliminationEffect = eliminatedOptions?.[opt]
          const eliminatedIndex = eliminatedOrder.indexOf(opt)
          return (
            <AnswerOptionComponent
              key={opt}
              option={opt}
              text={question.options[opt]}
              onPress={onSelectOption}
              answerState={answerState}
              selectedOption={selectedOption}
              correctOption={correctOption}
              eliminated={eliminatedIndex >= 0}
              eliminationEffect={eliminationEffect}
              eliminatedIndex={eliminatedIndex >= 0 ? eliminatedIndex : 0}
            />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    overflow: 'visible',
  },
  gradientAccent: {
    position: 'absolute',
    top: 0,
    left: -spacing.lg,
    right: -spacing.lg,
    height: 80,
    zIndex: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 1,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  diffDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  diffLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  xpBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  xpLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  questionText: {
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: spacing.sm,
    zIndex: 1,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
})
