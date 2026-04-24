import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { colors, spacing, radius, fontSize } from '../../constants/theme'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], styles[size], isDisabled && styles.disabled, style]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress() }}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '700' },
  primaryText: { color: '#fff' },
  secondaryText: { color: colors.textPrimary },
  ghostText: { color: colors.primary },
  smText: { fontSize: fontSize.sm },
  mdText: { fontSize: fontSize.md },
  lgText: { fontSize: fontSize.lg },
})
