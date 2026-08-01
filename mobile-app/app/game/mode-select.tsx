import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { haptics } from '../../src/lib/haptics'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
import { router } from 'expo-router'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { GAME_CONFIG } from '../../src/constants/game'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { GameModeArtwork, type GameModeId } from '../../src/components/ui/GameModeArtwork'

const MODES = [
  {
    id: 'classic' as GameModeId,
    label: 'Classic',
    description: 'Pick a topic, 10 questions, earn XP',
    color: colors.primary,
    route: '/game/mode-intro?mode=classic',
  },
  {
    id: 'blitz' as GameModeId,
    label: 'Blitz',
    description: `${GAME_CONFIG.BLITZ_SECONDS} seconds, unlimited questions, no hammers`,
    color: colors.gold,
    route: '/game/mode-intro?mode=blitz',
  },
  {
    id: 'survival' as GameModeId,
    label: 'Survival',
    description: 'One life, endless rounds, go as far as you can',
    color: colors.incorrect,
    route: '/game/mode-intro?mode=survival',
  },
] as const

export default function ModeSelectScreen() {
  const handleSelect = (route: string) => {
    haptics.confirm()
    router.push(route as Parameters<typeof router.push>[0])
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <AnimatedPressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Go back">
            <AppIcon name="back" size={24} />
          </AnimatedPressable>
        </View>

        <Text style={styles.title}>Game Mode</Text>
        <Text style={styles.subtitle}>How do you want to play?</Text>

        <View style={styles.list}>
          {MODES.map((mode) => (
            <AnimatedPressable
              key={mode.id}
              style={styles.card}
              onPress={() => handleSelect(mode.route)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[`${mode.color}33`, `${mode.color}08`]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <LinearGradient
                colors={[mode.color, `${mode.color}00`]}
                style={styles.topLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <View style={styles.cardRow}>
                <GameModeArtwork mode={mode.id} />
                <View style={styles.cardText}>
                  <Text style={styles.label}>{mode.label}</Text>
                  <Text style={styles.description}>{mode.description}</Text>
                </View>
              </View>
            </AnimatedPressable>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  back: { padding: spacing.sm, alignSelf: 'flex-start', marginBottom: spacing.xs },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: -spacing.sm },
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardText: { flex: 1, gap: spacing.xs },
  label: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  description: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
})
