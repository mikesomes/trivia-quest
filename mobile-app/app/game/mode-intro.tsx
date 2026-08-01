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
import { GameIcon, type GameIconName } from '../../src/components/icons'

type Mode = 'classic' | 'blitz' | 'survival'

const CATEGORIES: Category[] = ['general_knowledge', 'history', 'science', 'sports', 'movies_tv', 'geography']

const INTRO_CONFIG: Record<Mode, {
  icon: GameIconName
  title: string
  subtitle: string
  rules: { icon: GameIconName; text: string }[]
  ctaLabel: string
  nextRoute?: string
}> = {
  classic: {
    icon: 'brain' as GameIconName,
    title: 'Classic Mode',
    subtitle: '10 questions. Pick your battle.',
    rules: [
      { icon: 'list' as GameIconName, text: '10 questions per round' },
      { icon: 'timer' as GameIconName, text: '15 seconds per question' },
      { icon: 'target' as GameIconName, text: 'Choose your topic and difficulty' },
      { icon: 'star' as GameIconName, text: 'Earn XP based on speed and accuracy' },
      { icon: 'hammer' as GameIconName, text: 'Use hammers to eliminate wrong answers' },
    ],
    ctaLabel: 'Choose a Topic',
    nextRoute: '/game/category',
  },
  blitz: {
    icon: 'xp' as GameIconName,
    title: 'Blitz Mode',
    subtitle: '45 seconds. Unlimited questions.',
    rules: [
      { icon: 'timer' as GameIconName, text: '45 seconds on the clock — answer as many as you can' },
      { icon: 'shuffle' as GameIconName, text: 'Categories rotate automatically between questions' },
      { icon: 'xp' as GameIconName, text: 'Correct streaks add bonus time to the clock' },
      { icon: 'wrong' as GameIconName, text: 'Wrong answers cost 5 seconds' },
      { icon: 'prohibit' as GameIconName, text: 'No hammers — raw knowledge only' },
      { icon: 'trophy' as GameIconName, text: 'Score is based on questions answered correctly' },
    ],
    ctaLabel: 'Choose a Topic',
    nextRoute: '/game/blitz-category',
  },
  survival: {
    icon: 'flame' as GameIconName,
    title: 'Survival Mode',
    subtitle: 'How far can you go?',
    rules: [
      { icon: 'skull' as GameIconName, text: 'One wrong answer ends your run' },
      { icon: 'endless' as GameIconName, text: 'Endless questions, no round limit' },
      { icon: 'trendUp' as GameIconName, text: 'Difficulty ramps progressively as you go' },
      { icon: 'shuffle' as GameIconName, text: 'Categories rotate for maximum variety' },
      { icon: 'trophy' as GameIconName, text: 'Ranked by questions answered, then run XP' },
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
          <GameIcon name={config.icon} size={56} />
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </View>

        {mode === 'survival' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Difficulty Ramp</Text>
            <View style={styles.ladder}>
              <View style={styles.ladderRow}>
                <View style={[styles.ladderDot, { backgroundColor: colors.easy }]} />
                <Text style={styles.ladderLabel}>Early rounds</Text>
                <Text style={[styles.ladderLevel, { color: colors.easy }]}>MOSTLY EASY</Text>
              </View>
              <View style={styles.ladderRow}>
                <View style={[styles.ladderDot, { backgroundColor: colors.medium }]} />
                <Text style={styles.ladderLabel}>Mid rounds</Text>
                <Text style={[styles.ladderLevel, { color: colors.medium }]}>MIXED</Text>
              </View>
              <View style={styles.ladderRow}>
                <View style={[styles.ladderDot, { backgroundColor: colors.hard }]} />
                <Text style={styles.ladderLabel}>Late rounds</Text>
                <Text style={[styles.ladderLevel, { color: colors.hard }]}>ALL HARD</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          {config.rules.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <View style={styles.ruleIcon}><GameIcon name={rule.icon} size={20} /></View>
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
  // A drawn dot rather than a "●" glyph: exact size, no font metrics involved.
  // The difficulty is also spelled out in the row's label, so color is never
  // the only cue.
  ladderDot: { width: 8, height: 8, borderRadius: radius.full, marginHorizontal: 4 },
  ladderLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  ladderLevel: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ruleIcon: { width: 28, alignItems: 'center' },
  ruleText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  actions: { gap: spacing.sm },
})
