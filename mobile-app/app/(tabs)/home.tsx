import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { router, type Href } from 'expo-router'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { useProfile } from '../../src/hooks/useProfile'
import { formatLevel } from '../../src/utils/format'
import { XpProgressBar } from '../../src/components/profile/XpProgressBar'
import { EasterEggModal } from '../../src/components/ui/EasterEggModal'
import { DailyChallengeCard } from '../../src/components/home/DailyChallengeCard'
import { Lightning, Brain, Fire } from 'phosphor-react-native'
import { QuestHeroCard } from '../../src/components/home/QuestHeroCard'
import { useQuestStore } from '../../src/store/questStore'
import { QUEST_CATEGORIES } from '../../src/config/questConfig'

export default function HomeScreen() {
  const { data: profile } = useProfile()
  const categoryProgress = useQuestStore(s => s.categoryProgress)
  const totalNodes = QUEST_CATEGORIES.reduce((sum, cat) => sum + cat.nodes.length, 0)
  const completedNodes = QUEST_CATEGORIES.reduce((sum, cat) => {
    const prog = categoryProgress[cat.id]
    return sum + (prog?.completedNodeIds.length ?? 0)
  }, 0)

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
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGreetingTap} activeOpacity={1}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.greetingName}>{profile?.displayName ?? ''}!</Text>
          </TouchableOpacity>
          {profile && (
            <Text style={styles.metaRow}>
              {formatLevel(profile.level)} · 💰 {profile.coins.toLocaleString()}
            </Text>
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

        {/* Quest hero — featured mode */}
        <QuestHeroCard
          totalNodes={totalNodes}
          completedNodes={completedNodes}
          isLoading={false}
          onPress={() => router.push('/quest')}
        />

        {/* Daily challenge */}
        <DailyChallengeCard />

        {/* Play Modes */}
        <View style={styles.modesSection}>
          <Text style={styles.sectionLabel}>Play Modes</Text>
          <View style={styles.modesRow}>
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => router.push('/game/mode-intro?mode=classic' as Href)}
              activeOpacity={0.8}
            >
              <Brain weight="duotone" size={24} color={colors.primary} />
              <Text style={styles.modeTitle}>Classic</Text>
              <Text style={styles.modeSubtitle}>Pick a topic</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => router.push('/game/mode-intro?mode=blitz' as Href)}
              activeOpacity={0.8}
            >
              <Lightning weight="duotone" size={24} color={colors.timerWarning} />
              <Text style={styles.modeTitle}>Blitz</Text>
              <Text style={styles.modeSubtitle}>60s sprint</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => router.push('/game/mode-intro?mode=survival' as Href)}
              activeOpacity={0.8}
            >
              <Fire weight="duotone" size={24} color={colors.incorrect} />
              <Text style={styles.modeTitle}>Survival</Text>
              <Text style={styles.modeSubtitle}>One life</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <EasterEggModal visible={showEasterEgg} onDismiss={() => setShowEasterEgg(false)} />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { gap: spacing.xs },
  greeting: { fontSize: fontSize.xl, fontWeight: '600', color: colors.textSecondary },
  greetingName: { fontSize: fontSize.xxxl, fontWeight: '900', color: colors.textPrimary },
  metaRow: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
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
    gap: spacing.sm,
  },
  modeCard: {
    flex: 1,
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
