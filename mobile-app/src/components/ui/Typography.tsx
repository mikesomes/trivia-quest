import React from 'react'
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native'
import { colors, fontSize } from '../../constants/theme'

// Typography primitives. Use the <Label>/<Title>/<Stat> components for new UI,
// and spread the `typography` presets into existing StyleSheet entries that
// need a per-screen tweak (a different size or letter-spacing) but should still
// inherit the shared weight, color, and numeric behaviour.

/** Digits that occupy equal width, so counters don't jitter as values change.
 * Spread into any style whose text is a number that animates or updates. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] }

export const typography = {
  /** Uppercase micro-label above sections ("PLAY MODES"). */
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  } as TextStyle,
  /** Screen/section title. */
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.textPrimary,
  } as TextStyle,
  /** Display number (XP, scores, timers) — tabular digits so counters don't jitter. */
  stat: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    ...tabularNums,
  } as TextStyle,
}

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

const styles = StyleSheet.create(typography)
