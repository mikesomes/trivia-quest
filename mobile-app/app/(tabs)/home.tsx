import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
import { router, type Href } from 'expo-router'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { useProfile } from '../../src/hooks/useProfile'
import { formatLevel } from '../../src/utils/format'
import { XpProgressBar } from '../../src/components/profile/XpProgressBar'
import { EasterEggModal } from '../../src/components/ui/EasterEggModal'
import { DailyChallengeCard } from '../../src/components/home/DailyChallengeCard'
import { DailyChestCard } from '../../src/components/home/DailyChestCard'
import { DailyQuestsCard } from '../../src/components/home/DailyQuestsCard'
import { Reveal } from '../../src/components/ui/Reveal'
import { Lightning, Brain, Fire, PuzzlePiece } from 'phosphor-react-native'
import { QuestHeroCard } from '../../src/components/home/QuestHeroCard'
import { useQuestMap } from '../../src/hooks/useQuestMap'
import { GAME_CONFIG } from '../../src/constants/game'
import { tabularNums } from '../../src/components/ui/Typography'
import { CoinIcon, FlameIcon } from '../../src/components/icons'

export default function HomeScreen() {
  const { data: profile } = useProfile()
  // Node counts come from the server map, the same source the quest tab reads.
  // Deriving them from local state here would drift the moment a round is
  // completed on another device.
  const { data: questMap, isLoading: isQuestMapLoading } = useQuestMap()
  const totalNodes = questMap?.nodes.length ?? 0
  const completedNodes = questMap?.nodes.filter(node => node.status === 'completed').length ?? 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'

  const [showEasterEgg, setShowEasterEgg] = useState(false)
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current)
    }
  }, [])

  const handleGreetingTap = () => {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    if (tapCount.current >= 7) {
      tapCount.current = 0
      setShowEasterEgg(true)
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 1500)
    }
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <Reveal style={styles.headerReveal}>
          <View style={styles.header}>
            <AnimatedPressable onPress={handleGreetingTap} activeOpacity={1} scaleTo={1}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.greetingName}>{profile?.displayName ?? ''}!</Text>
            </AnimatedPressable>
            {profile && (
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{formatLevel(profile.level)}</Text>
                <Text style={styles.metaDot}>·</Text>
                <CoinIcon size={14} />
                <Text style={styles.metaText}>{profile.coins.toLocaleString()}</Text>
                {(profile.dayStreak ?? 0) > 0 && (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <FlameIcon size={14} />
                    <Text style={styles.metaText}>
                      {profile.dayStreak} day{profile.dayStreak === 1 ? '' : 's'}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* XP bar */}
          {profile && (
            <XpProgressBar
              currentXp={profile.xp}
              level={profile.level}
              xpToNextLevel={profile.xpToNextLevel}
            />
          )}
        </Reveal>

        {/* Quest hero — featured mode */}
        <Reveal delay={70}>
          <QuestHeroCard
            totalNodes={totalNodes}
            completedNodes={completedNodes}
            isLoading={isQuestMapLoading}
            onPress={() => router.push('/quest')}
          />
        </Reveal>

        {/* Daily challenge */}
        <Reveal delay={140}>
          <DailyChallengeCard />
        </Reveal>

        {/* Daily loot chest */}
        <Reveal delay={210}>
          <DailyChestCard />
        </Reveal>

        {/* Daily/weekly XP quests */}
        <Reveal delay={280}>
          <DailyQuestsCard />
        </Reveal>

        {/* Play Modes */}
        <Reveal delay={350}>
          <View style={styles.modesSection}>
            <Text style={styles.sectionLabel}>Play Modes</Text>
            <View style={styles.modesRow}>
              <AnimatedPressable
                style={styles.modeCard}
                onPress={() => router.push('/game/mode-intro?mode=classic' as Href)}
                activeOpacity={0.8}
              >
                <Brain weight="duotone" size={24} color={colors.primary} />
                <Text style={styles.modeTitle}>Classic</Text>
                <Text style={styles.modeSubtitle}>Pick a topic</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.modeCard}
                onPress={() => router.push('/game/mode-intro?mode=blitz' as Href)}
                activeOpacity={0.8}
              >
                <Lightning weight="duotone" size={24} color={colors.timerWarning} />
                <Text style={styles.modeTitle}>Blitz</Text>
                <Text style={styles.modeSubtitle}>{GAME_CONFIG.BLITZ_SECONDS}s sprint</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.modeCard}
                onPress={() => router.push('/game/mode-intro?mode=survival' as Href)}
                activeOpacity={0.8}
              >
                <Fire weight="duotone" size={24} color={colors.incorrect} />
                <Text style={styles.modeTitle}>Survival</Text>
                <Text style={styles.modeSubtitle}>One life</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.modeCard}
                onPress={() => router.push('/game/mode-intro?mode=odd_one_out' as Href)}
                activeOpacity={0.8}
              >
                <PuzzlePiece weight="duotone" size={24} color="#10B981" />
                <Text style={styles.modeTitle}>Odd One Out</Text>
                <Text style={styles.modeSubtitle}>Find the misfit</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Reveal>
      </ScrollView>
      <EasterEggModal visible={showEasterEgg} onDismiss={() => setShowEasterEgg(false)} />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  headerReveal: { gap: spacing.md },
  header: { gap: spacing.xs },
  greeting: { fontSize: fontSize.xl, fontWeight: '600', color: colors.textSecondary },
  greetingName: { fontSize: fontSize.xxxl, fontWeight: '900', color: colors.textPrimary },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.xs,
  },
  metaText: {
    ...tabularNums,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  metaDot: { fontSize: fontSize.md, color: colors.textMuted },
  modesSection: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modeCard: {
    width: '48%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  modeTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modeSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
})
