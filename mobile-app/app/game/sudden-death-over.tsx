import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { Button } from '../../src/components/ui/Button'
import { LevelUpModal } from '../../src/components/game/LevelUpModal'
import { NewAchievementsToast } from '../../src/components/game/NewAchievementsToast'
import { ShareModal } from '../../src/components/share/ShareModal'
import { useGameStore } from '../../src/store/gameStore'
import { useSubmitSuddenDeath } from '../../src/hooks/useSuddenDeath'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { haptics } from '../../src/lib/haptics'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { XpCounter } from '../../src/components/game/XpCounter'
import { tabularNums } from '../../src/components/ui/Typography'

export default function SuddenDeathOverScreen() {
  const sdBatchNumber = useGameStore((s) => s.sdBatchNumber)
  const sdBaseXp = useGameStore((s) => s.sdBaseXp)
  const currentPosition = useGameStore((s) => s.currentPosition)
  const xpEarnedInRound = useGameStore((s) => s.xpEarnedInRound)
  const sdRoundIds = useGameStore((s) => s.sdRoundIds)
  const resetGame = useGameStore((s) => s.resetGame)

  // Display-only values — the backend computes authoritative totals from DB records
  const questionsAnswered = sdBatchNumber * 10 + currentPosition
  const runXp = sdBaseXp + xpEarnedInRound

  const submitSuddenDeath = useSubmitSuddenDeath()
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const gameOverMusic = useAudioPlayer(require('../../assets/sounds/game-over.mp3'))

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    gameOverMusic.volume = 0.5
    gameOverMusic.play()
    haptics.defeat()
    return () => { try { gameOverMusic.pause() } catch {} }
  }, [])

  useEffect(() => {
    if (!submitSuddenDeath.isPending && !submitSuddenDeath.isSuccess && !submitSuddenDeath.isError) {
      submitSuddenDeath.mutate({ roundIds: sdRoundIds })
    }
  }, [])

  useEffect(() => {
    if (submitSuddenDeath.data?.leveledUp) setShowLevelUp(true)
  }, [submitSuddenDeath.data])

  const handlePlayAgain = () => {
    resetGame()
    router.replace('/game/mode-intro?mode=survival' as Parameters<typeof router.replace>[0])
  }

  const handleHome = () => {
    resetGame()
    router.replace('/(tabs)/home')
  }

  const difficultyReached = questionsAnswered >= 40 ? 'HARD' : questionsAnswered >= 20 ? 'MEDIUM' : 'EASY'
  const difficultyColor = questionsAnswered >= 40 ? colors.hard : questionsAnswered >= 20 ? colors.medium : colors.easy

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eliminated}>ELIMINATED</Text>
          <Text style={styles.emoji}>💀</Text>
        </View>

        {/* Main stat */}
        <View style={styles.mainCard}>
          <Text style={styles.questionsLabel}>QUESTIONS ANSWERED</Text>
          <Text style={styles.questionsCount}>{questionsAnswered}</Text>
          <View style={styles.difficultyRow}>
            <Text style={styles.difficultyLabel}>Reached</Text>
            <Text style={[styles.difficultyValue, { color: difficultyColor }]}>{difficultyReached}</Text>
          </View>
        </View>

        {/* Run XP */}
        <View style={styles.xpTotalCard}>
          <Text style={styles.xpTotalLabel}>RUN XP</Text>
          <XpCounter finalXp={runXp} />
        </View>

        {/* XP / Rank */}
        {submitSuddenDeath.isPending && (
          <View style={styles.xpCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.savingText}>Saving run...</Text>
          </View>
        )}

        {submitSuddenDeath.data && (
          <>
            <View style={styles.xpCard}>
              <Text style={styles.xpEarned}>+{submitSuddenDeath.data.xpEarned} XP</Text>
            </View>
            <View style={styles.rankCard}>
              <Text style={styles.rankLabel}>SURVIVAL MODE RANK</Text>
              <Text style={styles.rankNumber}>#{submitSuddenDeath.data.rank}</Text>
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Try Again" onPress={handlePlayAgain} size="lg" />
          {submitSuddenDeath.isSuccess && (
            <Button title="Share Result" onPress={() => setShowShare(true)} variant="secondary" size="lg" />
          )}
          <Button title="Home" onPress={handleHome} variant="ghost" />
        </View>
      </ScrollView>

      {submitSuddenDeath.data?.newAchievements && submitSuddenDeath.data.newAchievements.length > 0 && (
        <View style={styles.toastContainer}>
          <NewAchievementsToast achievements={submitSuddenDeath.data.newAchievements} />
        </View>
      )}
      <LevelUpModal
        visible={showLevelUp}
        newLevel={submitSuddenDeath.data?.newLevel ?? 0}
        onDismiss={() => setShowLevelUp(false)}
      />
      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        data={{
          mode: 'sudden-death',
          xpEarned: submitSuddenDeath.data?.runXp ?? runXp,
          questionsAnswered,
        }}
      />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  eliminated: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.incorrect,
    letterSpacing: 6,
  },
  emoji: { fontSize: 56 },
  mainCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  questionsLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  questionsCount: { ...tabularNums, fontSize: 80, fontWeight: '900', color: colors.textPrimary, lineHeight: 88 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  difficultyLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  difficultyValue: { fontSize: fontSize.sm, fontWeight: '800', letterSpacing: 1 },
  xpTotalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  xpTotalLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  xpCard: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  xpEarned: { ...tabularNums, fontSize: fontSize.xxl, fontWeight: '900', color: colors.primary },
  savingText: { fontSize: fontSize.sm, color: colors.textSecondary },
  rankCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  rankLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  rankNumber: { ...tabularNums, fontSize: 52, fontWeight: '900', color: colors.textPrimary },
  actions: { gap: spacing.sm },
  toastContainer: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg },
})
