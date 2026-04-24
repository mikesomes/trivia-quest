import React from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { Button } from '../../src/components/ui/Button'
import { useCreateRound } from '../../src/hooks/useRound'
import { useGameStore } from '../../src/store/gameStore'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import type { Category } from '../../src/types/game'
import { getSurvivalMix, dominantDifficulty } from '../../src/utils/difficultyMix'
import { GAME_CONFIG } from '../../src/constants/game'

type Mode = 'classic' | 'blitz' | 'survival'

const CATEGORIES: Category[] = ['general_knowledge', 'history', 'science', 'sports', 'movies_tv', 'geography']

const INTRO_CONFIG: Record<Mode, {
  emoji: string
  title: string
  subtitle: string
  rules: { icon: string; text: string }[]
  ctaLabel: string
  nextRoute?: string
}> = {
  classic: {
    emoji: '🧠',
    title: 'Classic Mode',
    subtitle: '10 questions. Pick your battle.',
    rules: [
      { icon: '📋', text: '10 questions per round' },
      { icon: '⏱️', text: '15 seconds per question' },
      { icon: '🎯', text: 'Choose your topic and difficulty' },
      { icon: '⭐', text: 'Earn XP based on speed and accuracy' },
      { icon: '🔨', text: 'Use hammers to eliminate wrong answers' },
    ],
    ctaLabel: 'Choose a Topic',
    nextRoute: '/game/category',
  },
  blitz: {
    emoji: '⚡',
    title: 'Blitz Mode',
    subtitle: '60 seconds. Unlimited questions.',
    rules: [
      { icon: '⏱️', text: '60 seconds on the clock — answer as many as you can' },
      { icon: '🔀', text: 'Categories rotate automatically between questions' },
      { icon: '⚡', text: 'Correct streaks add bonus time to the clock' },
      { icon: '🚫', text: 'No hammers — raw knowledge only' },
      { icon: '🏆', text: 'Score is based on questions answered correctly' },
    ],
    ctaLabel: 'Choose a Topic',
    nextRoute: '/game/blitz-category',
  },
  survival: {
    emoji: '🔥',
    title: 'Survival Mode',
    subtitle: 'How far can you go?',
    rules: [
      { icon: '💀', text: 'One wrong answer ends your run' },
      { icon: '♾️', text: 'Endless questions, no round limit' },
      { icon: '📈', text: 'Difficulty ramps progressively as you go' },
      { icon: '🔀', text: 'Categories rotate for maximum variety' },
      { icon: '🏆', text: 'Ranked by questions answered, then run XP' },
    ],
    ctaLabel: 'Start Survival Mode',
  },
}

export default function ModeIntroScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>()
  const config = INTRO_CONFIG[mode as Mode]

  const createRound = useCreateRound()
  const setIsSuddenDeath = useGameStore((s) => s.setIsSuddenDeath)
  const setDifficulty = useGameStore((s) => s.setDifficulty)
  const resetGame = useGameStore((s) => s.resetGame)

  if (!config) return null

  const handleSurvivalStart = async () => {
    resetGame()
    setIsSuddenDeath(true)
    const startMix = getSurvivalMix(0, GAME_CONFIG.BLITZ_QUESTIONS)
    const startDifficulty = dominantDifficulty(startMix)
    setDifficulty(startDifficulty)
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    try {
      await createRound.mutateAsync({ category, difficulty: startDifficulty, difficultyMix: startMix, isSurvival: true })
      router.replace('/game/play')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start survival mode. Please try again.'
      Alert.alert('Error', msg)
    }
  }

  const handleCta = () => {
    if (mode === 'survival') {
      handleSurvivalStart()
    } else if (config.nextRoute) {
      router.push(config.nextRoute as Parameters<typeof router.push>[0])
    }
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.emoji}>{config.emoji}</Text>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </View>

        {mode === 'survival' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Difficulty Ramp</Text>
            <View style={styles.ladder}>
              <View style={styles.ladderRow}>
                <Text style={[styles.ladderDot, { color: colors.easy }]}>●</Text>
                <Text style={styles.ladderLabel}>Early rounds</Text>
                <Text style={[styles.ladderLevel, { color: colors.easy }]}>MOSTLY EASY</Text>
              </View>
              <View style={styles.ladderRow}>
                <Text style={[styles.ladderDot, { color: colors.medium }]}>●</Text>
                <Text style={styles.ladderLabel}>Mid rounds</Text>
                <Text style={[styles.ladderLevel, { color: colors.medium }]}>MIXED</Text>
              </View>
              <View style={styles.ladderRow}>
                <Text style={[styles.ladderDot, { color: colors.hard }]}>●</Text>
                <Text style={styles.ladderLabel}>Late rounds</Text>
                <Text style={[styles.ladderLevel, { color: colors.hard }]}>ALL HARD</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          {config.rules.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleIcon}>{rule.icon}</Text>
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title={config.ctaLabel}
            onPress={handleCta}
            size="lg"
            disabled={mode === 'survival' && createRound.isPending}
          />
          <Button
            title="Back"
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  titleSection: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emoji: { fontSize: 64 },
  title: { fontSize: 40, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1 },
  subtitle: { fontSize: fontSize.lg, color: colors.textSecondary },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  ladder: { gap: spacing.sm },
  ladderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ladderDot: { fontSize: 10, width: 16 },
  ladderLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  ladderLevel: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ruleIcon: { fontSize: 20, width: 28 },
  ruleText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  actions: { gap: spacing.sm },
})
