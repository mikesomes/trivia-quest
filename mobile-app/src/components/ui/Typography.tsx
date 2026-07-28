import React from 'react'
import { StyleSheet, Text, type TextProps } from 'react-native'
import { colors, fontSize } from '../../constants/theme'

// Typography primitives — use these instead of restyling <Text> per screen so
// hierarchy stays consistent app-wide.

/** Uppercase micro-label above sections ("PLAY MODES"). */
export function Label({ style, ...props }: TextProps) {
  return <Text style={[styles.label, style]} {...props} />
}

/** Screen/section title. */
export function Title({ style, ...props }: TextProps) {
  return <Text style={[styles.title, style]} {...props} />
}

/** Display number (XP, scores, timers) — tabular digits so counters don't jitter. */
export function Stat({ style, ...props }: TextProps) {
  return <Text style={[styles.stat, style]} {...props} />
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stat: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
})
