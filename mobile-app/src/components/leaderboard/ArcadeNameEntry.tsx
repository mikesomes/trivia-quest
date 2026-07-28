import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TextInput,
  Animated, Easing, ActivityIndicator,
} from 'react-native'
import { colors, spacing, fontSize, radius } from '../../constants/theme'
import { profileApi } from '../../api/profile'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { tabularNums } from '../ui/Typography'

const MAX_NAME_LENGTH = 12

interface Props {
  onSubmit: (name: string) => void
}

export function ArcadeNameEntry({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const glowAnim = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    ).start()
  }, [])

  const borderColor = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.primary, colors.primaryLight] })

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 1) { setError('Enter a name to continue'); return }
    if (!/^[a-zA-Z0-9 _\-!.]+$/.test(trimmed)) { setError('Letters, numbers, spaces and _ - ! . only'); return }
    setSaving(true)
    setError('')
    try {
      await profileApi.setDisplayName(trimmed)
      onSubmit(trimmed)
    } catch {
      setError('Failed to save. Try again.')
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.insert}>— INSERT COIN —</Text>
      <Text style={styles.heading}>ENTER YOUR NAME</Text>
      <Text style={styles.sub}>to join the global rankings</Text>

      <Animated.View style={[styles.inputWrap, { borderColor }]}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => { setName(t.toUpperCase().slice(0, MAX_NAME_LENGTH)); setError('') }}
          placeholder="AAA"
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_NAME_LENGTH}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
      </Animated.View>

      <Text style={styles.counter}>{name.trim().length}/{MAX_NAME_LENGTH}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AnimatedPressable
        style={[styles.btn, (!name.trim() || saving) && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={!name.trim() || saving}
        activeOpacity={0.8}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.btnText}>PRESS START</Text>
        }
      </AnimatedPressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  insert: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    letterSpacing: 3,
    fontWeight: '600',
  },
  heading: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  sub: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    letterSpacing: 1,
    marginTop: -spacing.sm,
  },
  inputWrap: {
    borderWidth: 2,
    borderRadius: radius.md,
    width: '100%',
    marginTop: spacing.md,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  counter: { ...tabularNums,
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    marginTop: -spacing.sm,
  },
  error: {
    color: colors.incorrect,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    minWidth: 200,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: colors.textOnAccent,
    fontWeight: '900',
    fontSize: fontSize.md,
    letterSpacing: 3,
  },
})
