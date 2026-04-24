import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
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
import { useQuestStore } from '../../src/store/questStore'
import { QUEST_CATEGORIES } from '../../src/config/questConfig'
import { calculateStars, calculateQuestXp, getNewlyRevealedNodes } from '../../src/utils/questProgress'
import { useSoundEffects } from '../../src/hooks/useSoundEffects'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { Button } from '../../src/components/ui/Button'
import { StarRating } from '../../src/components/quest/StarRating'
import { XpCountUp } from '../../src/components/game/XpCountUp'
import { Coins } from 'phosphor-react-native'
import { levelFromXp } from '../../src/utils/scoring'
import type { QuestRoundResult } from '../../src/types/quest'
import { getClassicProgressionMix, dominantDifficulty } from '../../src/utils/difficultyMix'
import { GAME_CONFIG } from '../../src/constants/game'

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

// ─── Quest results layout ────────────────────────────────────────────────────
function QuestResults({
  questResult,
  totalXp,
  onRetry,
  onQuestMap,
}: {
  questResult: QuestRoundResult | null
  totalXp?: number
  onRetry: () => void
  onQuestMap: () => void
}) {
  const roundResult = useGameStore((s) => s.roundResult)

  if (!questResult) {
    return (
      <View style={styles.questEvaluating}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.evaluatingText}>Evaluating result…</Text>
      </View>
    )
  }

  const accuracy = roundResult && roundResult.totalQuestions > 0
    ? Math.round((roundResult.correctCount / roundResult.totalQuestions) * 100)
    : 0

  return (
    <View style={styles.questSection}>
      {/* Pass / Fail header */}
      <View style={styles.questHeader}>
        {questResult.passed ? (
          <>
            <Text style={styles.passedText}>LEVEL COMPLETE</Text>
            <StarRating stars={questResult.stars} size={32} />
          </>
        ) : (
          <>
            <Text style={styles.failedText}>NOT QUITE</Text>
            <Text style={styles.failedSub}>
              {`${questResult.correctCount}/${questResult.totalAnswered} correct — keep practicing`}
            </Text>
          </>
        )}
      </View>

      {/* Stats + XP row */}
      <View style={styles.questStats}>
        <View style={styles.questStat}>
          <Text style={styles.questStatValue}>{questResult.correctCount}/{questResult.totalAnswered}</Text>
          <Text style={styles.questStatLabel}>Correct</Text>
        </View>
        <View style={styles.questStatDivider} />
        <View style={styles.questStat}>
          <Text style={styles.questStatValue}>{accuracy}%</Text>
          <Text style={styles.questStatLabel}>Accuracy</Text>
        </View>
        <View style={styles.questStatDivider} />
        <View style={styles.questStat}>
          <Text style={[styles.questStatValue, { color: colors.primary }]}>+{questResult.xpEarned}</Text>
          <Text style={styles.questStatLabel}>XP Earned</Text>
        </View>
      </View>

      {totalXp !== undefined && (
        <View style={styles.questTotalCard}>
          <Text style={styles.questTotalLabel}>Total XP</Text>
          <Text style={styles.questTotalValue}>{totalXp.toLocaleString()} XP</Text>
        </View>
      )}

      {/* Newly revealed nodes */}
      {questResult.passed && questResult.newlyRevealedNodeIds.length > 0 && (
        <View style={styles.mapCompleteCard}>
          <Text style={styles.mapCompleteEmoji}>🔓</Text>
          <Text style={styles.mapCompleteText}>New node{questResult.newlyRevealedNodeIds.length > 1 ? 's' : ''} unlocked!</Text>
          <Text style={styles.mapCompleteSub}>Continue in the category map to see what's next.</Text>
        </View>
      )}

      {questResult.passed ? (
        <Button title="Category Map" onPress={onQuestMap} size="lg" variant="primary" />
      ) : (
        <Button title="Try Again" onPress={onRetry} size="lg" variant="primary" />
      )}

      <Button title="Quest Map" onPress={onQuestMap} variant="ghost" />
    </View>
  )
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
  const questNodeId = useGameStore((s) => s.questNodeId)
  const questCategoryId = useGameStore((s) => s.questCategoryId)
  const questGameMode = useGameStore((s) => s.questGameMode)
  const isBlitzStore = useGameStore((s) => s.isBlitz)
  const isBlitz = questGameMode === 'blitz' || isBlitzStore
  const setDifficulty = useGameStore((s) => s.setDifficulty)
  const incrementRound = useGameStore((s) => s.incrementRound)
  const resetGame = useGameStore((s) => s.resetGame)
  const submitXp = useSubmitXp()
  const createRound = useCreateRound()
  const completeDailyChallenge = useCompleteDailyChallenge()
  const { data: profile } = useProfile()
  const [questRoundResult, setQuestRoundResult] = useState<QuestRoundResult | null>(null)
  const { play } = useSoundEffects()
  const completeNode = useQuestStore((s) => s.completeNode)

  const interimMusic = useAudioPlayer(require('../../assets/sounds/interim-round.mp3'))
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const questXpEarned = questRoundResult ? questRoundResult.xpEarned : roundResult?.xpEarned ?? 0
  const questPreviousXp = Math.max(0, (profile?.xp ?? 0) - questXpEarned)
  const questLeveledUp = !!profile && questXpEarned > 0 && profile.level > levelFromXp(questPreviousXp)

  const nextRoundNumber = roundNumber + 1
  const nextMix = getClassicProgressionMix(roundNumber, GAME_CONFIG.QUESTIONS_PER_ROUND)
  const nextDifficulty = dominantDifficulty(nextMix)

  const handleNextRound = async () => {
    if (!selectedCategory) return
    play('nextRound')
    incrementRound()
    setDifficulty(nextDifficulty)
    try {
      await createRound.mutateAsync({ category: selectedCategory, difficulty: nextDifficulty, difficultyMix: nextMix  })
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
    if (!questNodeId && roundId && roundResult && !xpResult && !submitXp.isPending) {
      submitXp.mutate(roundId)
    }
  }, [questNodeId, roundId, roundResult])

  useEffect(() => {
    if (xpResult?.leveledUp) setShowLevelUp(true)
  }, [xpResult])

  useEffect(() => {
    if (questNodeId && questLeveledUp) setShowLevelUp(true)
  }, [questNodeId, questLeveledUp])

  useEffect(() => {
    if (isDailyChallenge && xpResult && roundId && !completeDailyChallenge.isPending && !completeDailyChallenge.isSuccess) {
      completeDailyChallenge.mutate(roundId)
    }
  }, [isDailyChallenge, xpResult, roundId])

  useEffect(() => {
    if (!questNodeId || !questCategoryId || !roundResult || questRoundResult) return
    const category = QUEST_CATEGORIES.find(c => c.id === questCategoryId)
    const node = category?.nodes.find(n => n.id === questNodeId)
    if (!node || !category) return

    const stars = calculateStars(node, roundResult.correctCount, roundResult.totalQuestions)
    const questState = useQuestStore.getState()
    const catProgress = questState.categoryProgress[questCategoryId]
    const prevBestStars = catProgress?.bestStars[questNodeId] ?? 0
    const isFirstClear = !(catProgress?.completedNodeIds ?? []).includes(questNodeId)
    const xpEarned = calculateQuestXp(node, stars, isFirstClear, prevBestStars)
    const updatedCompleted = [...(catProgress?.completedNodeIds ?? []), questNodeId]
    const newlyRevealed = getNewlyRevealedNodes(category, updatedCompleted)

    const result: QuestRoundResult = {
      nodeId: questNodeId,
      categoryId: questCategoryId,
      stars,
      passed: stars > 0,
      correctCount: roundResult.correctCount,
      totalAnswered: roundResult.totalQuestions,
      xpEarned,
      newlyRevealedNodeIds: newlyRevealed.map(n => n.id),
      isFirstClear,
    }
    completeNode(result)
    setQuestRoundResult(result)
    if (roundId) submitXp.mutate(roundId)
  }, [questNodeId, questCategoryId, roundResult])

  if (!roundResult) {
    return (
      <ScreenWrapper>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
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
  const showRegularXpSummary = !questNodeId &&
    optimisticPreviousXp !== undefined &&
    optimisticNewXp !== undefined

  // ── Quest mode layout ────────────────────────────────────────────────────
  if (questNodeId) {
    return (
      <ScreenWrapper>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {questRoundResult && profile && questXpEarned > 0 && (
            <XpCountUp
              xpEarned={questXpEarned}
              previousXp={questPreviousXp}
              newXp={profile.xp}
              leveledUp={questLeveledUp}
              newLevel={profile.level}
            />
          )}

          {/* Quest-specific result block */}
          <QuestResults
            questResult={questRoundResult}
            totalXp={profile?.xp}
            onRetry={() => { resetGame(); router.replace(`/quest/${questCategoryId}` as never) }}
            onQuestMap={() => { resetGame(); router.replace(`/quest/${questCategoryId}` as never) }}
          />

        </ScrollView>

        {xpResult?.newAchievements && xpResult.newAchievements.length > 0 && (
          <View style={styles.toastContainer}>
            <NewAchievementsToast achievements={xpResult.newAchievements} />
          </View>
        )}
        <LevelUpModal
          visible={showLevelUp}
          newLevel={profile?.level ?? 0}
          onDismiss={() => setShowLevelUp(false)}
        />
      </ScreenWrapper>
    )
  }

  // ── Regular / daily mode layout ──────────────────────────────────────────
  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {isBlitz && (
          <View style={[styles.dailyBadge, { borderColor: `${colors.streakActive}44`, backgroundColor: `${colors.streakActive}18` }]}>
            <Text style={[styles.dailyBadgeText, { color: colors.streakActive }]}>⚡ Blitz Complete!</Text>
            <Text style={[styles.dailyStreakText, { color: colors.textSecondary }]}>
              {roundResult.answers.length} questions answered in 60s
            </Text>
          </View>
        )}

        {isDailyChallenge && (
          <View style={styles.dailyBadge}>
            <Text style={styles.dailyBadgeText}>📅 Daily Challenge Complete!</Text>
            {completeDailyChallenge.data && completeDailyChallenge.data.streak > 0 && (
              <Text style={styles.dailyStreakText}>🔥 {completeDailyChallenge.data.streak} day streak</Text>
            )}
          </View>
        )}

        <View style={styles.titleSection}>
          <Text style={styles.finishedLabel}>
            {isDailyChallenge ? "Today's Challenge" : isBlitz ? 'Blitz Round' : `Round ${roundNumber} Complete!`}
          </Text>
        </View>

        {submitXp.isPending && (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.xpText}>Saving XP…</Text>
          </View>
        )}

        {showRegularXpSummary && (
          <XpCountUp
            xpEarned={optimisticXpEarned}
            previousXp={optimisticPreviousXp}
            newXp={optimisticNewXp}
            leveledUp={optimisticLeveledUp}
            newLevel={optimisticNewLevel}
            breakdown={xpResult?.xpBreakdown}
          />
        )}

        {showRegularXpSummary && optimisticXpEarned > 0 && (
          <View style={styles.coinsEarnedRow}>
            <Coins weight="duotone" size={16} color="#FFD700" />
            <Text style={styles.coinsEarnedText}>
              +{optimisticXpEarned.toLocaleString()} coins earned
            </Text>
            {xpResult?.xpBreakdown && roundResult?.xpBoosterApplied && (
              <Text style={styles.boosterBadge}>⚡ XP Booster active</Text>
            )}
          </View>
        )}

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
            <Text style={styles.statValue}>{roundResult.longestStreak}🔥</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>

        {(roundResult.bonusSummary.totalSpeedBonus > 0 || roundResult.bonusSummary.totalStreakBonus > 0) && (
          <View style={styles.bonusCard}>
            <Text style={styles.bonusTitle}>XP Details</Text>
            {roundResult.bonusSummary.totalSpeedBonus > 0 && (
              <Text style={styles.bonusLine}>⚡ Speed bonus: +{roundResult.bonusSummary.totalSpeedBonus} XP</Text>
            )}
            {roundResult.bonusSummary.totalStreakBonus > 0 && (
              <Text style={styles.bonusLine}>🔥 Streak bonus: +{roundResult.bonusSummary.totalStreakBonus} XP</Text>
            )}
          </View>
        )}

        {xpResult && (
          <>
            {xpResult.newBestXp && (
              <View style={styles.newBestCard}>
                <Text style={styles.newBest}>🏆 New personal best XP!</Text>
              </View>
            )}
          </>
        )}

        {xpResult && xpResult.sessionRound > 1 && (
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
        )}

        {xpResult && (
          <View style={styles.rankCard}>
            <Text style={styles.rankLabel}>GLOBAL RANK</Text>
            <Text style={styles.rankNumber}>#{xpResult.rank}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {!isDailyChallenge && (
            <Button
              title={`Round ${nextRoundNumber} → ${nextDifficulty.charAt(0).toUpperCase() + nextDifficulty.slice(1)}`}
              onPress={handleNextRound}
              size="lg"
              disabled={createRound.isPending}
            />
          )}
          <Button title="Play Again" onPress={() => { resetGame(); router.replace('/game/category') }} size="lg" variant="secondary" />
          <Button title="Leaderboard" onPress={() => { resetGame(); router.replace('/(tabs)/leaderboard') }} variant="secondary" size="lg" />
          {xpResult && <Button title="Share Result" onPress={() => setShowShare(true)} variant="secondary" size="lg" />}
          <Button title="Home" onPress={() => { resetGame(); router.replace('/(tabs)/home') }} variant="ghost" />
        </View>
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  titleSection: { alignItems: 'center' },
  finishedLabel: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0, fontWeight: '600', marginBottom: -spacing.sm },

  // ── Quest styles ──────────────────────────────────────────────────────────
  questSection: { gap: spacing.lg },
  questEvaluating: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.md },
  evaluatingText: { fontSize: fontSize.sm, color: colors.textSecondary },

  questHeader: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  passedText: { fontSize: 32, fontWeight: '900', color: colors.correct, letterSpacing: 3 },
  failedText: { fontSize: 32, fontWeight: '900', color: colors.incorrect, letterSpacing: 2 },
  failedSub: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  improvedText: { fontSize: fontSize.sm, color: colors.streakActive, fontWeight: '700' },

  questStats: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  questStat: { flex: 1, alignItems: 'center', gap: 4 },
  questStatValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  questStatLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  questStatDivider: { width: 1, height: 32, backgroundColor: colors.border },
  questTotalCard: {
    backgroundColor: `${colors.primary}12`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  questTotalLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  questTotalValue: { fontSize: fontSize.lg, fontWeight: '900', color: colors.primary },
  questBonusText: { fontSize: fontSize.xs, color: colors.textSecondary },

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
  nextCardEmoji: { fontSize: 32 },
  nextCardBody: {
    padding: spacing.md,
    gap: 3,
    alignItems: 'center',
  },
  nextCardTitle: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  nextCardDiff: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1 },
  nextCardMode: { fontSize: fontSize.xs, color: colors.textSecondary },
  nextCardXp: { fontSize: fontSize.xs, fontWeight: '800' },

  mapCompleteCard: {
    backgroundColor: `${colors.streakActive}15`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapCompleteEmoji: { fontSize: 40 },
  mapCompleteText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.streakActive },
  mapCompleteSub: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },

  // ── Regular mode styles ───────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
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
  coinsEarnedText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFD700' },
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
  sessionValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
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
  rankNumber: { fontSize: 52, fontWeight: '900', color: colors.textPrimary },
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
