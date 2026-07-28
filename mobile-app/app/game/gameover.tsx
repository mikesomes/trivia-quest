import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { LevelUpModal } from '../../src/components/game/LevelUpModal'
import { NewAchievementsToast } from '../../src/components/game/NewAchievementsToast'
import { ShareModal } from '../../src/components/share/ShareModal'
import { router } from 'expo-router'
import { useGameStore } from '../../src/store/gameStore'
import { useAuthStore } from '../../src/store/authStore'
import { useSubmitXp } from '../../src/hooks/useSubmitXp'
import { useProfile } from '../../src/hooks/useProfile'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { Button } from '../../src/components/ui/Button'
import { XpCountUp } from '../../src/components/game/XpCountUp'
import { ArcadeNameEntry } from '../../src/components/leaderboard/ArcadeNameEntry'
import { levelFromXp } from '../../src/utils/scoring'
import { tabularNums } from '../../src/components/ui/Typography'
import { TrophyIcon, FlameIcon } from '../../src/components/icons'
import { Skeleton, SkeletonBox } from '../../src/components/ui/Skeleton'

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export default function GameOverScreen() {
  const roundResult = useGameStore((s) => s.roundResult)
  const xpResult = useGameStore((s) => s.xpResult)
  const roundId = useGameStore((s) => s.roundId)
  const roundNumber = useGameStore((s) => s.roundNumber)
  const xpEarnedInRound = useGameStore((s) => s.xpEarnedInRound)
  const selectedCategory = useGameStore((s) => s.selectedCategory)
  const selectedDifficulty = useGameStore((s) => s.selectedDifficulty)
  const questNodeId = useGameStore((s) => s.questNodeId)
  const questCategoryId = useGameStore((s) => s.questCategoryId)
  const resetGame = useGameStore((s) => s.resetGame)
  const displayName = useAuthStore((s) => s.displayName)
  const setDisplayName = useAuthStore((s) => s.setDisplayName)
  const submitXp = useSubmitXp()
  const { data: profile } = useProfile()
  const gameOverMusic = useAudioPlayer(require('../../assets/sounds/game-over.mp3'))
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const questRoundXp = roundResult?.xpEarned ?? 0
  const questPreviousXp = Math.max(0, (profile?.xp ?? 0) - questRoundXp)
  const questLeveledUp = !!profile && questRoundXp > 0 && profile.level > levelFromXp(questPreviousXp)

  useEffect(() => {
    if (xpResult?.leveledUp) setShowLevelUp(true)
  }, [xpResult])

  useEffect(() => {
    if (questNodeId && questLeveledUp) setShowLevelUp(true)
  }, [questNodeId, questLeveledUp])

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    gameOverMusic.play()
    return () => { try { gameOverMusic.pause() } catch {} }
  }, [])

  useEffect(() => {
    if (roundId && roundResult && !xpResult && !submitXp.isPending) {
      submitXp.mutate(roundId)
    }
  }, [roundId, roundResult])

  const handlePlayAgain = () => {
    resetGame()
    router.replace('/game/category')
  }

  const handleGoHome = () => {
    resetGame()
    router.replace('/(tabs)/home')
  }

  const handleLeaderboard = () => {
    resetGame()
    router.replace('/(tabs)/leaderboard')
  }

  if (!roundResult) {
    return (
      <ScreenWrapper>
        <Skeleton label="Loading your results" style={styles.skeletonScreen}>
          <SkeletonBox width={180} height={26} style={styles.skeletonCenter} />
          <SkeletonBox width="100%" height={120} borderRadius={radius.lg} />
          <SkeletonBox width="100%" height={92} borderRadius={radius.lg} />
          <SkeletonBox width="100%" height={64} borderRadius={radius.lg} />
        </Skeleton>
      </ScreenWrapper>
    )
  }

  const accuracy = roundResult.totalQuestions > 0
    ? Math.round((roundResult.correctCount / roundResult.totalQuestions) * 100)
    : 0
  const isSavingProgress = submitXp.isPending
  const optimisticXpEarned = finiteNumber(xpResult?.xpEarned) ?? finiteNumber(xpEarnedInRound) ?? finiteNumber(roundResult.xpEarned) ?? 0
  const optimisticPreviousXp = xpResult
    ? Math.max(0, (finiteNumber(xpResult.newXp) ?? 0) - (finiteNumber(xpResult.xpEarned) ?? 0))
    : finiteNumber(profile?.xp)
  const optimisticNewXp = finiteNumber(xpResult?.newXp) ?? (
    optimisticPreviousXp !== undefined
      ? optimisticPreviousXp + optimisticXpEarned
      : undefined
  )
  const optimisticLeveledUp = xpResult?.leveledUp ?? (
    optimisticPreviousXp !== undefined &&
    optimisticNewXp !== undefined &&
    levelFromXp(optimisticNewXp) > levelFromXp(optimisticPreviousXp)
  )
  const optimisticNewLevel = finiteNumber(xpResult?.newLevel) ?? (
    optimisticNewXp !== undefined ? levelFromXp(optimisticNewXp) : undefined
  )
  const showRegularXpSummary = !questNodeId &&
    optimisticPreviousXp !== undefined &&
    optimisticNewXp !== undefined

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.roundLabel}>Round {roundNumber}</Text>
          <Text style={styles.gameOverText}>GAME OVER</Text>
          <Text style={styles.livesLabel}>All lives lost</Text>
        </View>

        {/* XP */}
        {isSavingProgress && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.xpText}>Saving XP…</Text>
          </View>
        )}

        {showRegularXpSummary && (
          <>
            <XpCountUp
              xpEarned={optimisticXpEarned}
              previousXp={optimisticPreviousXp}
              newXp={optimisticNewXp}
              leveledUp={optimisticLeveledUp}
              newLevel={optimisticNewLevel}
              breakdown={xpResult?.xpBreakdown}
            />
            {xpResult?.newBestXp && (
              <View style={styles.newBestCard}>
                <TrophyIcon size={15} /><Text style={styles.newBest}>New personal best XP!</Text>
              </View>
            )}
          </>
        )}

        {!xpResult && questNodeId && profile && roundResult.xpEarned > 0 && (
          <XpCountUp
            xpEarned={roundResult.xpEarned}
            previousXp={questPreviousXp}
            newXp={profile.xp}
            leveledUp={questLeveledUp}
            newLevel={profile.level}
          />
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{roundResult.correctCount}/{roundResult.totalQuestions}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.stat}>
            <View style={styles.inlineStat}><Text style={styles.statValue}>{roundResult.longestStreak}</Text><FlameIcon size={15} /></View>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>

        {/* Bonus summary */}
        {(roundResult.bonusSummary.totalSpeedBonus > 0 || roundResult.bonusSummary.totalStreakBonus > 0) && (
          <View style={styles.bonusCard}>
            <Text style={styles.bonusTitle}>XP Details</Text>
            {roundResult.bonusSummary.totalSpeedBonus > 0 && (
              <Text style={styles.bonusLine}>Speed bonus: +{roundResult.bonusSummary.totalSpeedBonus} XP</Text>
            )}
            {roundResult.bonusSummary.totalStreakBonus > 0 && (
              <Text style={styles.bonusLine}>Streak bonus: +{roundResult.bonusSummary.totalStreakBonus} XP</Text>
            )}
          </View>
        )}

        {/* Leaderboard rank */}
        {xpResult && (
          <View style={styles.rankCard}>
            <Text style={styles.rankLabel}>GLOBAL RANK</Text>
            <Text style={styles.rankNumber}>#{xpResult.rank}</Text>
            {displayName && (
              <Text style={styles.rankName}>{displayName}</Text>
            )}
          </View>
        )}

        {/* Name entry */}
        {xpResult && !displayName && (
          <ArcadeNameEntry onSubmit={(name) => setDisplayName(name)} />
        )}


        {/* Actions */}
        <View style={styles.actions}>
          {questNodeId && questCategoryId ? (
            <>
              <Button title="Try Again" onPress={() => { resetGame(); router.replace(`/quest/${questCategoryId}` as never) }} size="lg" />
              <Button title="Quest Hub" onPress={() => { resetGame(); router.replace('/quest' as never) }} variant="secondary" size="lg" />
            </>
          ) : (
            <>
              <Button title="Play Again" onPress={handlePlayAgain} size="lg" />
              <Button title="Leaderboard" onPress={handleLeaderboard} variant="secondary" size="lg" />
              {xpResult && <Button title="Share Result" onPress={() => setShowShare(true)} variant="secondary" size="lg" />}
            </>
          )}
          <Button title="Home" onPress={handleGoHome} variant="ghost" />
        </View>
      </ScrollView>

      {xpResult?.newAchievements && xpResult.newAchievements.length > 0 && (
        <View style={styles.toastContainer}>
          <NewAchievementsToast achievements={xpResult.newAchievements} />
        </View>
      )}
      <LevelUpModal
        visible={showLevelUp}
        newLevel={xpResult?.newLevel ?? profile?.level ?? 0}
        onDismiss={() => setShowLevelUp(false)}
      />
      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        data={{
          mode: 'regular',
          xpEarned: xpResult?.xpEarned ?? roundResult?.xpEarned ?? 0,
          answers: roundResult?.answers.map(a => a.isCorrect),
          correctCount: roundResult?.correctCount,
          totalQuestions: roundResult?.totalQuestions,
          longestStreak: roundResult?.longestStreak,
          category: selectedCategory,
          difficulty: selectedDifficulty,
          roundNumber,
        }}
      />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  skeletonScreen: { flex: 1, padding: spacing.lg, gap: spacing.md },
  skeletonCenter: { alignSelf: 'center', marginVertical: spacing.lg },

  content: { padding: spacing.lg, gap: spacing.lg },
  headerSection: { alignItems: 'center', paddingTop: spacing.xl },
  roundLabel: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0, fontWeight: '600' },
  gameOverText: { fontSize: 52, fontWeight: '900', color: colors.incorrect, letterSpacing: 0, marginTop: spacing.xs },
  livesLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  inlineStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { ...tabularNums, fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  bonusCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bonusTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  bonusLine: { fontSize: fontSize.sm, color: colors.textSecondary },
  loadingCard: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  newBestCard: {
    backgroundColor: `${colors.streakActive}15`,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
  },
  newBest: { fontSize: fontSize.md, fontWeight: '700', color: colors.streakActive },
  xpText: { fontSize: fontSize.sm, color: colors.textSecondary },
  rankCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '600' },
  rankNumber: { ...tabularNums, fontSize: 52, fontWeight: '900', color: colors.textPrimary },
  rankName: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  actions: { gap: spacing.sm, paddingBottom: spacing.xl },
  toastContainer: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg },
})
