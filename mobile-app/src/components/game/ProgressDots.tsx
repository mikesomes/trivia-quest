import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { AnswerResult } from '../../types/game'
import { colors } from '../../constants/theme'
import { GAME_CONFIG } from '../../constants/game'

interface ProgressDotsProps {
  answerHistory: AnswerResult[]
  currentPosition: number
}

export const ProgressDots = React.memo(function ProgressDots({ answerHistory, currentPosition }: ProgressDotsProps) {
  const total = GAME_CONFIG.QUESTIONS_PER_ROUND

  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const result = answerHistory.find((r) => r.position === i)
        const isCurrent = i === currentPosition

        let bg: string
        if (result) {
          bg = result.isCorrect ? colors.correct : colors.incorrect
        } else if (isCurrent) {
          bg = colors.textPrimary
        } else {
          bg = colors.border
        }

        return (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: bg },
              isCurrent && styles.dotCurrent,
            ]}
          />
        )
      })}
    </View>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
