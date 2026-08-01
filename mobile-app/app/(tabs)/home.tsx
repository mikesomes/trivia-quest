import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
import { colors, edges, fontSize, spacing } from '../../src/constants/theme'
import { useProfile } from '../../src/hooks/useProfile'
import { levelProgress } from '../../src/utils/scoring'
import { ProgressBar } from '../../src/components/ui/ProgressBar'
import { EasterEggModal } from '../../src/components/ui/EasterEggModal'
import { DailyChallengeCard } from '../../src/components/home/DailyChallengeCard'
import { QuestsCard } from '../../src/components/home/QuestsCard'
import { PlayModes } from '../../src/components/home/PlayModes'
import { Reveal } from '../../src/components/ui/Reveal'
import { tabularNums } from '../../src/components/ui/Typography'
import { CoinIcon } from '../../src/components/icons'

export default function HomeScreen() {
  const { data: profile } = useProfile()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Reveal style={styles.header}>
          <AnimatedPressable onPress={handleGreetingTap} activeOpacity={1} scaleTo={1}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name}>{profile?.displayName ?? ''}</Text>
          </AnimatedPressable>
          {profile && (
            <View style={styles.progress}>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Level {profile.level}</Text>
                <Text style={styles.metaDot}>·</Text>
                <CoinIcon size={13} />
                <Text style={styles.metaText}>{profile.coins.toLocaleString()}</Text>
              </View>
              {/* The bar carries no visible labels, so it states its own value
                  for screen readers rather than dropping the information. */}
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={`Level ${profile.level}, ${profile.xpToNextLevel} XP to level ${profile.level + 1}`}
              >
                <ProgressBar
                  progress={levelProgress(profile.xp, profile.level)}
                  color={colors.primary}
                  height={4}
                  trackColor={edges.track}
                />
              </View>
            </View>
          )}
        </Reveal>

        {/* Today: the daily challenge, with quests as a quiet companion row */}
        <Reveal delay={70} style={styles.today}>
          <DailyChallengeCard />
          <QuestsCard />
        </Reveal>

        <Reveal delay={140}>
          <PlayModes />
        </Reveal>
      </ScrollView>
      <EasterEggModal visible={showEasterEgg} onDismiss={() => setShowEasterEgg(false)} />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  header: { gap: spacing.md },
  greeting: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },
  name: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  progress: { gap: spacing.sm },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...tabularNums,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  metaDot: { fontSize: fontSize.sm, color: colors.textMuted },
  today: { gap: spacing.md },
})
