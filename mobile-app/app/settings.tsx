import React from 'react'
import { View, Text, StyleSheet, Switch } from 'react-native'
import { router } from 'expo-router'
import { ScreenWrapper } from '../src/components/ui/ScreenWrapper'
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable'
import { AppIcon } from '../src/components/ui/AppIcon'
import { colors, spacing, fontSize, radius } from '../src/constants/theme'
import { useSoundMuted } from '../src/hooks/useSoundMuted'
import { setSoundMuted } from '../src/lib/sound'

export default function SettingsScreen() {
  const muted = useSoundMuted()

  return (
    <ScreenWrapper>
      <View style={styles.topRow}>
        <AnimatedPressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Go back">
          <AppIcon name="back" size={24} />
        </AnimatedPressable>
      </View>

      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <AppIcon name={muted ? 'soundOff' : 'soundOn'} size="md" />
          <Text style={styles.rowLabelText}>Sound</Text>
        </View>
        <Switch
          value={!muted}
          onValueChange={(enabled) => setSoundMuted(!enabled)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.textPrimary}
        />
      </View>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  back: { padding: spacing.sm, marginLeft: -spacing.sm },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '900',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabelText: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
})
