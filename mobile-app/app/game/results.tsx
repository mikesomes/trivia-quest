import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { LevelUpModal } from '../../src/components/game/LevelUpModal'
import { NewAchievementsToast } from '../../src/components/game/NewAchievementsToast'
import { ShareModal } from '../../src/components/share/ShareModal'
import { useCompleteDailyChallenge } from '../../src/hooks/useDailyChallenge'
import { router } from 'expo-router'
import { useGameStore } from '../../src/store/gameStore'
import { useSubmitXp } from '../../src/hooks/useSubmitXp'
import { useCreateRound } from '../../src/hooks/useRound'
import { useProfile } from '../../src/hooks/useProfile'
import { useSoundEffects } from '../../src/hooks/useSoundEffects'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { Button } from '../../src/components/ui/Button'
import { XpCountUp } from '../../src/components/game/XpCountUp'
import { Coins } from 'phosphor-react-native'
import { levelFromXp } from '../../src/utils/scoring'
import { getClassicProgressionMix, dominantDifficulty } from '../../src/utils/difficultyMix'
import { GAME_CONFIG } from '../../src/constants/game'
import { maybeAskForPermission } from '../../src/lib/notifications'
import { useChallenges } from '../../src/hooks/useChallenges'
import { useCountdownSeconds } from '../../src/hooks/useCountdownSeconds'
import { formatNextStepNudge } from '../../src/utils/nextStepNudge'
import { Reveal } from '../../src/components/ui/Reveal'
import { Pulse } from '../../src/components/ui/Pulse'
import { WalletBadge } from '../../src/components/game/WalletBadge'
import { tabularNums } from '../../src/components/ui/Typography'
import { GameIcon, XpIcon, CalendarIcon, FlameIcon, TrophyIcon } from '../../src/components/icons'
import { Skeleton, SkeletonBox } from '../../src/components/ui/Skeleton'

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ResultsScreen() {
  const roundResult = useGameStore((s) => s.roundResult)
  const xpResult = useGameStore((s) => s.xpResult)
  const roundId = useGameStore((s) => s.roundId)
  const selectedCategory = useGameStore((s) => s.selectedCategory)
  const selectedDifficulty = useGameStore((s) => s.selectedDifficulty)
  const roundNumber = useGameStore((s) => s.roundNumber)
  const xpEarnedInRound = useGameStore((s) => s.xpEarnedInRound)
  const isDailyChallenge = useGameStore((s) => s.isDailyChallenge)
  const isBlitz = useGameStore((s) => s.isBlitz)
  const setDifficulty = useGameStore((s) => s.setDifficulty)
  const incrementRound = useGameStore((s) => s.incrementRound)
  const resetGame = useGameStore((s) => s.resetGame)
  const submitXp = useSubmitXp()
  const createRound = useCreateRound()
  const completeDailyChallenge = useCompleteDailyChallenge()
  const { data: profile } = useProfile()
  const { data: challengesData } = useChallenges()
  const { play } = useSoundEffects()

  const interimMusic = useAudioPlayer(require('../../assets/sounds/interim-round.mp3'))
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const nextRoundNumber = roundNumber + 1
  const nextMix = getClassicProgressionMix(roundNumber, GAME_CONFIG.QUESTIONS_PER_ROUND)
  const nextDifficulty = dominantDifficulty(nextMix)

  // "One more round" momentum: counts down from the moment results loads,
  // mirroring the server's own window (enforced against completed_at at
  // create-round time — this countdown is purely informational).
  const [resultsMountedAt] = useState(() => Date.now())
  const momentumSecondsLeft = useCountdownSeconds(GAME_CONFIG.MOMENTUM_WINDOW_SECONDS, resultsMountedAt)
  const momentumAvailable = !isDailyChallenge && momentumSecondsLeft > 0

  const nextStepNudge = formatNextStepNudge({
    xpToNextLevel: xpResult?.xpToNextLevel,
    newLevel: xpResult?.newLevel,
    challenges: challengesData?.challenges ?? [],
  })

  const handleNextRound = async () => {
    if (!selectedCategory) return
    play('nextRound')
    incrementRound()
    setDifficulty(nextDifficulty)
    try {
      await createRound.mutateAsync({ category: selectedCategory, difficulty: nextDifficulty, difficultyMix: nextMix, continuationRoundId: roundId ?? undefined })
      router.replace('/game/play')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start next round. Please try again.'
      Alert.alert('Error', msg)
    }
  }

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    interimMusic.volume = 0.5
    interimMusic.loop = true
    interimMusic.play()
    return () => { try { interimMusic.pause() } catch {} }
  }, [])

  useEffect(() => {
    if (roundId && roundResult && !xpResult && !submitXp.isPending) {
      submitXp.mutate(roundId)
    }
  }, [roundId, roundResult])

  useEffect(() => {
    if (xpResult?.leveledUp) setShowLevelUp(true)
  }, [xpResult])

  // Ask for notification permission once, after the player's first finished
  // round — a moment of goodwill, never at cold start.
  useEffect(() => {
    if (!roundResult) return
    const timer = setTimeout(() => { maybeAskForPermission().catch(() => {}) }, 2000)
    return () => clearTimeout(timer)
  }, [roundResult])

  useEffect(() => {
    if (isDailyChallenge && xpResult && roundId && !completeDailyChallenge.isPending && !completeDailyChallenge.isSuccess) {
      completeDailyChallenge.mutate(roundId)
    }
  }, [isDailyChallenge, xpResult, roundId])

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
  const showRegularXpSummary =
    optimisticPreviousXp !== undefined &&
    optimisticNewXp !== undefined

  // Coins earned equal XP earned 1:1 (server-enforced). Sourced from
  // xpResult.newCoins (not profile.coins) so the wallet count-up never races
  // the profile query's background refetch.
  const newCoinsTotal = finiteNumber(xpResult?.newCoins)
  const previousCoinsTotal = newCoinsTotal !== undefined
    ? Math.max(0, newCoinsTotal - optimisticXpEarned)
    : undefined

  // ── Regular / daily mode layout ──────────────────────────────────────────
  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Reveal>
          {isBlitz && (
            <View style={[styles.dailyBadge, { borderColor: `${colors.streakActive}44`, backgroundColor: `${colors.streakActive}18` }]}>
              <XpIcon size={14} color={colors.streakActive} /><Text style={[styles.dailyBadgeText, { color: colors.streakActive }]}>Blitz Complete!</Text>
              <Text style={[styles.dailyStreakText, { color: colors.textSecondary }]}>
                {roundResult.answers.length} questions answered in {GAME_CONFIG.BLITZ_SECONDS}s
              </Text>
            </View>
          )}

          {isDailyChallenge && (
            <View style={styles.dailyBadge}>
              <CalendarIcon size={14} /><Text style={styles.dailyBadgeText}>Daily Challenge Complete!</Text>
              {completeDailyChallenge.data && completeDailyChallenge.data.streak > 0 && (
                <View style={styles.badgeInline}>
                  <FlameIcon size={13} />
                  <Text style={styles.dailyStreakText}>{completeDailyChallenge.data.streak} day streak</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.titleSection}>
            <Text style={styles.finishedLabel}>
              {isDailyChallenge ? "Today's Challenge" : isBlitz ? 'Blitz Round' : `Round ${roundNumber} Complete!`}
            </Text>
          </View>
        </Reveal>

        {submitXp.isPending && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.xpText}>Saving XP…</Text>
          </View>
        )}

        {showRegularXpSummary && (
          <Reveal delay={150}>
            <XpCountUp
              xpEarned={optimisticXpEarned}
              previousXp={optimisticPreviousXp}
              newXp={optimisticNewXp}
              leveledUp={optimisticLeveledUp}
              newLevel={optimisticNewLevel}
              breakdown={xpResult?.xpBreakdown}
            />
          </Reveal>
        )}

        {showRegularXpSummary && optimisticXpEarned > 0 && (
          <Reveal delay={220} style={styles.coinsEarnedRow}>
            <Coins weight="duotone" size={16} color={colors.gold} />
            <Text style={styles.coinsEarnedText}>
              +{optimisticXpEarned.toLocaleString()} coins earned
            </Text>
            {xpResult?.xpBreakdown && roundResult?.xpBoosterApplied && (
              <View style={styles.badgeInline}>
                <XpIcon size={13} />
                <Text style={styles.boosterBadge}>XP Booster active</Text>
              </View>
            )}
            {previousCoinsTotal !== undefined && newCoinsTotal !== undefined && (
              <WalletBadge previousCoins={previousCoinsTotal} newCoins={newCoinsTotal} />
            )}
          </Reveal>
        )}

        <Reveal delay={300}>
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
        </Reveal>

        {(roundResult.bonusSummary.totalSpeedBonus > 0 || roundResult.bonusSummary.totalStreakBonus > 0) && (
          <Reveal delay={380}>
            <View style={styles.bonusCard}>
              <Text style={styles.bonusTitle}>XP Details</Text>
              {roundResult.bonusSummary.totalSpeedBonus > 0 && (
                <Text style={styles.bonusLine}>Speed bonus: +{roundResult.bonusSummary.totalSpeedBonus} XP</Text>
              )}
              {roundResult.bonusSummary.totalStreakBonus > 0 && (
                <Text style={styles.bonusLine}>Streak bonus: +{roundResult.bonusSummary.totalStreakBonus} XP</Text>
              )}
            </View>
          </Reveal>
        )}

        {xpResult?.newBestXp && (
          <Reveal delay={460}>
            <View style={styles.newBestCard}>
              <TrophyIcon size={15} /><Text style={styles.newBest}>New personal best XP!</Text>
            </View>
          </Reveal>
        )}

        {xpResult && xpResult.sessionRound > 1 && (
          <Reveal delay={460}>
            <View style={styles.sessionCard}>
              <Text style={styles.sessionTitle}>Session Total · Round {xpResult.sessionRound}</Text>
              <View style={styles.sessionStats}>
                <View style={styles.sessionStat}>
                  <Text style={[styles.sessionValue, { color: colors.primary }]}>+{xpResult.sessionXpEarned}</Text>
                  <Text style={styles.sessionLabel}>XP</Text>
                </View>
                <View style={styles.sessionDivider} />
                <View style={styles.sessionStat}>
                  <Text style={styles.sessionValue}>{xpResult.sessionCorrectCount}</Text>
                  <Text style={styles.sessionLabel}>Correct</Text>
                </View>
              </View>
            </View>
          </Reveal>
        )}

        {xpResult && (
          <Reveal delay={540}>
            <View style={styles.rankCard}>
              <Text style={styles.rankLabel}>GLOBAL RANK</Text>
              <Text style={styles.rankNumber}>#{xpResult.rank}</Text>
            </View>
          </Reveal>
        )}

        {nextStepNudge && (
          <Reveal delay={620}>
            <View style={styles.nudgeCard}>
              <GameIcon name={nextStepNudge.icon} size={15} />
              <Text style={styles.nudgeText}>{nextStepNudge.text}</Text>
            </View>
          </Reveal>
        )}

        {momentumAvailable && (
          <Reveal delay={620}>
            <View style={styles.momentumChip}>
              <Text style={styles.momentumText}>
                Momentum: +{Math.round(GAME_CONFIG.MOMENTUM_BONUS_MULTIPLIER * 100)}% XP if you start within {formatMmSs(momentumSecondsLeft)}
              </Text>
            </View>
          </Reveal>
        )}

        <Reveal delay={700} style={styles.actions}>
          {!isDailyChallenge && (
            <Pulse>
              <Button
                title={`Round ${nextRoundNumber} →`}
                onPress={handleNextRound}
                size="lg"
                disabled={createRound.isPending}
              />
            </Pulse>
          )}
          <Button title="Play Again" onPress={() => { resetGame(); router.replace('/game/category') }} size="lg" variant="secondary" />
          <Button title="Leaderboard" onPress={() => { resetGame(); router.replace('/(tabs)/leaderboard') }} variant="secondary" size="lg" />
          {xpResult && <Button title="Share Result" onPress={() => setShowShare(true)} variant="secondary" size="lg" />}
          <Button title="Home" onPress={() => { resetGame(); router.replace('/(tabs)/home') }} variant="ghost" />
        </Reveal>
      </ScrollView>

      {xpResult?.newAchievements && xpResult.newAchievements.length > 0 && (
        <View style={styles.toastContainer}>
          <NewAchievementsToast achievements={xpResult.newAchievements} />
        </View>
      )}
      <LevelUpModal
        visible={showLevelUp}
        newLevel={xpResult?.newLevel ?? 0}
        onDismiss={() => setShowLevelUp(false)}
      />
      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        data={{
          mode: isDailyChallenge ? 'daily' : 'regular',
          xpEarned: xpResult?.xpEarned ?? roundResult?.xpEarned ?? 0,
          answers: roundResult?.answers.map(a => a.isCorrect),
          correctCount: roundResult?.correctCount,
          totalQuestions: roundResult?.totalQuestions,
          longestStreak: roundResult?.longestStreak,
          category: selectedCategory,
          difficulty: selectedDifficulty,
          roundNumber,
          dailyStreak: completeDailyChallenge.data?.streak,
        }}
      />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeletonScreen: { flex: 1, padding: spacing.lg, gap: spacing.md },
  skeletonCenter: { alignSelf: 'center', marginVertical: spacing.lg },

  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  titleSection: { alignItems: 'center' },
  finishedLabel: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0, fontWeight: '600', marginBottom: -spacing.sm },

  nextSection: { gap: spacing.md },
  nextTitle: { fontSize: fontSize.lg, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', letterSpacing: 0.5 },
  nextCards: { flexDirection: 'row', gap: spacing.md },
  nextCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  nextCardTop: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCardBody: {
    padding: spacing.md,
    gap: 3,
    alignItems: 'center',
  },
  nextCardTitle: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  nextCardDiff: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1 },
  nextCardMode: { fontSize: fontSize.xs, color: colors.textSecondary },
  nextCardXp: { ...tabularNums, fontSize: fontSize.xs, fontWeight: '800' },

  // ── Regular mode styles ───────────────────────────────────────────────────
  badgeInline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
  coinsEarnedRow: { alignItems: 'center', gap: 4 },
  coinsEarnedText: { ...tabularNums, fontSize: fontSize.md, fontWeight: '700', color: colors.gold },
  boosterBadge: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '700' },
  sessionCard: {
    backgroundColor: `${colors.streakActive}10`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.streakActive}40`,
  },
  sessionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.streakActive,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  sessionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStat: { flex: 1, alignItems: 'center', gap: 4 },
  sessionValue: { ...tabularNums, fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  sessionLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionDivider: { width: 1, height: 32, backgroundColor: `${colors.streakActive}30` },
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
  nudgeCard: {
    backgroundColor: `${colors.primary}12`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primaryLight, textAlign: 'center' },
  momentumChip: {
    backgroundColor: `${colors.streakActive}15`,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  momentumText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.streakActive,
    fontVariant: ['tabular-nums'],
  },
  actions: { gap: spacing.sm },
  toastContainer: { position: 'absolute', bottom: spacing.xl, left: spacing.lg, right: spacing.lg },
  dailyBadge: {
    backgroundColor: `${colors.primary}18`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dailyBadgeText: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  dailyStreakText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.streakActive },
})
