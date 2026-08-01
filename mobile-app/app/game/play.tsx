import React, { useEffect, useRef, useCallback } from 'react'
import { Animated, Easing, View, Text, StyleSheet, AppState, Alert, Platform, ScrollView } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { isAlreadyAnsweredError, isApiError } from '../../src/api/client'
import { flagsApi } from '../../src/api/flags'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { router } from 'expo-router'
import { useGameStore } from '../../src/store/gameStore'
import { useSubmitAnswer } from '../../src/hooks/useSubmitAnswer'
import { useHammer } from '../../src/hooks/useHammer'
import { useFinishRound, useCreateRound } from '../../src/hooks/useRound'
import { useProfile } from '../../src/hooks/useProfile'
import { useSoundEffects } from '../../src/hooks/useSoundEffects'
import { useAnimatedNumber } from '../../src/hooks/useAnimatedNumber'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
import { AppIcon } from '../../src/components/ui/AppIcon'
import ConfettiCannon from 'react-native-confetti-cannon'
import { QuestionCard } from '../../src/components/game/QuestionCard'
import { ProgressDots } from '../../src/components/game/ProgressDots'
import { FloatingXpPopup } from '../../src/components/game/FloatingXpPopup'
import { TimerBar } from '../../src/components/game/TimerBar'
import { RoundXpBar } from '../../src/components/game/RoundXpBar'
import { StreakMilestoneToast, STREAK_MILESTONES, type StreakMilestone } from '../../src/components/game/StreakMilestoneToast'
import { LivesDisplay } from '../../src/components/game/LivesDisplay'
import { HammersDisplay } from '../../src/components/game/HammersDisplay'
import { analytics } from '../../src/lib/analytics'
import { StreakIndicator } from '../../src/components/game/StreakIndicator'
import { StreakTargetIndicator } from '../../src/components/game/StreakTargetIndicator'
import { PauseModal } from '../../src/components/game/PauseModal'
import { ExtraLifeOverlay } from '../../src/components/game/ExtraLifeOverlay'
import { HammerEarnedOverlay } from '../../src/components/game/HammerEarnedOverlay'
import { RevealActions } from '../../src/components/game/RevealActions'
import { colors, spacing, fontSize } from '../../src/constants/theme'
import { GAME_CONFIG } from '../../src/constants/game'
import { isShieldBreakResult, type AnswerOption, type Category } from '../../src/types/game'
import { getSurvivalMix, dominantDifficulty } from '../../src/utils/difficultyMix'
import { announce, answerRevealMessage } from '../../src/lib/a11y'
import { useReducedMotion } from '../../src/hooks/useReducedMotion'

const SD_CATEGORIES: Category[] = ['general_knowledge', 'history', 'science', 'sports', 'movies_tv', 'geography']

const TICK_INTERVAL = 100 // ms
type EliminationEffect = 'hammer' | 'shield'

export default function PlayScreen() {
  const {
    roundId,
    questions,
    currentPosition,
    scoringTimerMode,
    selectedCategory,
    selectedDifficulty,
    streak,
    livesRemaining,
    hammers,
    shields: roundShields,
    isPaused,
    selectedOption,
    answerState,
    pendingResult,
    answerHistory,
    isSuddenDeath,
    xpEarnedInRound,
    sdBatchNumber,
    sdBaseXp,
    addSdBatchXp,
    addSdRoundId,
    setDifficulty,
    setShields,
    pauseGame,
    resumeGame,
    startQuestionTimer,
    getElapsedMs,
    getActiveScoringTimerSnapshot,
    selectOption,
    advanceQuestion,
    resetAnswerState,
    resetGame,
  } = useGameStore()

  const isBlitz = scoringTimerMode === 'round'

  // One label for every analytics event from this screen, so content quality
  // can be sliced by how the question was served rather than only by category.
  const analyticsGameMode = isSuddenDeath
    ? 'sudden_death'
    : isBlitz
      ? 'blitz'
      : 'classic'
  const BLITZ_MS = GAME_CONFIG.BLITZ_SECONDS * 1000

  const [timeRemainingMs, setTimeRemainingMs] = React.useState(
    isBlitz ? BLITZ_MS : GAME_CONFIG.TIMER_SECONDS * 1000
  )
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasTimedOutRef = useRef(false)
  const submitInFlightRef = useRef(false)

  const questionTranslateX = useRef(new Animated.Value(0)).current
  const questionOpacity = useRef(new Animated.Value(1)).current
  const correctGlowOpacity = useRef(new Animated.Value(0)).current
  const xpScale = useRef(new Animated.Value(1)).current
  const xpGlowOpacity = useRef(new Animated.Value(0)).current
  const confettiRef = useRef<ConfettiCannon>(null)
  const reducedMotion = useReducedMotion()
  const [showExtraLife, setShowExtraLife] = React.useState(false)
  const [showHammerEarned, setShowHammerEarned] = React.useState(false)
  const [streakMilestone, setStreakMilestone] = React.useState<StreakMilestone | null>(null)
  const [blitzBonusKey, setBlitzBonusKey] = React.useState<number | null>(null)
  const [eliminatedOptions, setEliminatedOptions] = React.useState<Partial<Record<AnswerOption, EliminationEffect>>>({})
  const [shieldBreakToken, setShieldBreakToken] = React.useState(0)
  const [flaggedQuestionIds, setFlaggedQuestionIds] = React.useState<Set<string>>(new Set())

  const flagQuestion = useMutation({
    mutationFn: (questionId: string) => flagsApi.flag(questionId),
    onSuccess: (_, questionId) => {
      setFlaggedQuestionIds((prev) => new Set([...prev, questionId]))
      // The earliest signal that a question is broken rather than merely hard —
      // it arrives long before the correct-rate rules have enough answers.
      analytics.questionFlagged({
        questionId,
        category: selectedCategory ?? 'unknown',
        difficulty: selectedDifficulty ?? 'unknown',
      })
    },
    onError: () => Alert.alert('Error', 'Could not flag question. Try again.'),
  })

  const unflagQuestion = useMutation({
    mutationFn: (questionId: string) => flagsApi.unflag(questionId),
    onSuccess: (_, questionId) => setFlaggedQuestionIds((prev) => {
      const next = new Set(prev)
      next.delete(questionId)
      return next
    }),
    onError: () => Alert.alert('Error', 'Could not unflag question. Try again.'),
  })

  const submitAnswer = useSubmitAnswer()
  const hammerMutation = useHammer()
  const finishRound = useFinishRound()
  const createRound = useCreateRound()
  const { data: profile } = useProfile()
  const { play } = useSoundEffects()
  const availableShields = roundShields

  const displayedXp = isSuddenDeath ? sdBaseXp + xpEarnedInRound : xpEarnedInRound
  const displayXp = useAnimatedNumber(displayedXp)

  const currentQuestion = questions[currentPosition]
  // Absolute question number for sudden death (shown in header)
  const absoluteQuestion = isSuddenDeath ? sdBatchNumber * GAME_CONFIG.BLITZ_QUESTIONS + currentPosition + 1 : null

  // Recorded on presentation rather than on answer, so questions abandoned
  // mid-round still count — the gap between presented and answered is where
  // a bad question shows up first.
  useEffect(() => {
    if (!currentQuestion) return
    analytics.questionPresented({
      questionId: currentQuestion.questionId,
      category: selectedCategory ?? 'unknown',
      difficulty: selectedDifficulty ?? 'unknown',
      gameMode: analyticsGameMode,
      position: currentPosition,
    })
  }, [currentQuestion?.questionId])

  useEffect(() => {
    submitInFlightRef.current = false
  }, [roundId, currentPosition])

  // Animate XP counter when XP is earned
  useEffect(() => {
    if (xpEarnedInRound === 0) return
    Animated.sequence([
      Animated.timing(xpScale, { toValue: 1.25, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(xpScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start()
    Animated.sequence([
      Animated.timing(xpGlowOpacity, { toValue: 0.7, duration: 100, useNativeDriver: true }),
      Animated.timing(xpGlowOpacity, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }, [xpEarnedInRound])

  // Announce the reveal for screen readers — correct/wrong is otherwise carried
  // only by the green/red fill and the pop/shake, which convey nothing here.
  useEffect(() => {
    if (answerState !== 'revealed' || !pendingResult) return
    announce(
      answerRevealMessage({
        isCorrect: pendingResult.isCorrect,
        correctAnswerText: pendingResult.correctOption && currentQuestion
          ? currentQuestion.options[pendingResult.correctOption]
          : undefined,
        xpEarned: pendingResult.xpGained,
      })
    )
  }, [answerState, pendingResult, currentQuestion])

  // Blitz: apply +5s time bonus when server returns streak milestone
  useEffect(() => {
    if (!isBlitz || !pendingResult?.timeBonus) return
    setTimeRemainingMs((prev) => Math.min(prev + pendingResult.timeBonus!, BLITZ_MS))
    setBlitzBonusKey(Date.now())
  }, [pendingResult?.timeBonus, isBlitz])

  // Navigate to results / gameover / sudden-death-over
  const handleRoundEnd = useCallback(async (livesLeft: number) => {
    if (!roundId) return
    clearInterval(timerRef.current!)
    const destination = isSuddenDeath
      ? '/game/sudden-death-over'
      : livesLeft === 0 ? '/game/gameover' : '/game/results'
    // In sudden death, record this (final/dying) round before finishing it
    if (isSuddenDeath) addSdRoundId(roundId)
    try {
      await finishRound.mutateAsync(roundId)
      router.replace(destination)
    } catch (err) {
      console.error('Failed to finish round:', err)
      router.replace(destination)
    }
  }, [roundId, finishRound, isSuddenDeath, addSdRoundId])

  // Sudden death: batch of 10 completed without error — chain the next batch
  const handleBatchComplete = useCallback(async () => {
    if (!roundId) return
    clearInterval(timerRef.current!)

    // Capture this batch's round ID BEFORE createRound overwrites roundId in the store
    const completedRoundId = roundId
    addSdRoundId(completedRoundId)

    // Save this batch's XP before startRound resets it
    addSdBatchXp(xpEarnedInRound)

    const nextBatch = sdBatchNumber + 1
    const nextMix = getSurvivalMix(nextBatch, GAME_CONFIG.BLITZ_QUESTIONS)
    const nextDifficulty = dominantDifficulty(nextMix)
    const nextCategory = SD_CATEGORIES[nextBatch % SD_CATEGORIES.length]
    setDifficulty(nextDifficulty)

    try {
      await finishRound.mutateAsync(completedRoundId)
    } catch { /* continue regardless */ }

    try {
      await createRound.mutateAsync({
        category: nextCategory,
        difficulty: nextDifficulty,
        difficultyMix: nextMix,
        isSurvival: true,
        continuationRoundId: completedRoundId,
      })
      // createRound onSuccess calls startRound → resets position/XP, loads new questions
      // Timer + animation will restart via the currentPosition useEffect below
    } catch {
      // No more questions available — end the run
      router.replace('/game/sudden-death-over')
    }
  }, [roundId, xpEarnedInRound, sdBatchNumber, finishRound, createRound, addSdBatchXp, addSdRoundId])

  // Handle answer submission
  const handleSubmit = useCallback(
    async (option: AnswerOption | null) => {
      if (!roundId || !currentQuestion || answerState !== 'idle' || submitInFlightRef.current) return

      submitInFlightRef.current = true
      clearInterval(timerRef.current!)
      selectOption(option ?? ('a' as AnswerOption)) // timeout uses null but we still need to call selectOption for state

      const timeTakenMs = getElapsedMs()
      const activeTimer = getActiveScoringTimerSnapshot(timeRemainingMs)

      try {
        const result = await submitAnswer.mutateAsync({
          roundId,
          questionId: currentQuestion.questionId,
          position: currentPosition,
          selectedOption: option,
          timeTakenMs,
          activeTimer,
          useShield: option !== null && availableShields > 0,
        })
        if (isShieldBreakResult(result)) {
          setShields(result.shieldsRemaining)
          play('shieldBreak')
          setShieldBreakToken((value) => value + 1)
          setEliminatedOptions((prev) => ({
            ...prev,
            [result.blockedOption]: 'shield',
          }))
          resetAnswerState()
          submitInFlightRef.current = false
          return
        }
        analytics.answerSubmitted({
          questionId: currentQuestion.questionId,
          category: selectedCategory ?? 'unknown',
          difficulty: selectedDifficulty ?? 'unknown',
          gameMode: analyticsGameMode,
          isCorrect: result.isCorrect,
          timeTakenMs,
          timedOut: option === null,
        })

        // recordAnswer fires via onSuccess — sets answerState: 'revealed' and pendingResult
        play(result.isCorrect ? 'correct' : 'wrong', result.isCorrect ? result.currentStreak : undefined)
        if (result.isCorrect) {
          if (!reducedMotion) confettiRef.current?.start()
          if (result.currentStreak === 3) {
            correctGlowOpacity.setValue(0)
            Animated.sequence([
              Animated.timing(correctGlowOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
              Animated.timing(correctGlowOpacity, { toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start()
          }
          const milestone = STREAK_MILESTONES[result.currentStreak]
          if (milestone) {
            setStreakMilestone({ ...milestone, key: Date.now() })
          }
        }
        if (result.lifeEarned) {
          play('extraLife')
          setShowExtraLife(true)
        }
        if (result.hammerEarned) {
          setShowHammerEarned(true)
        }
      } catch (err) {
        if (isAlreadyAnsweredError(err)) return
        submitInFlightRef.current = false
        if (isApiError(err) && err.status === 410) {
          Alert.alert('Round Expired', 'Your session timed out while you were away.', [
            { text: 'OK', onPress: () => router.replace('/game/gameover') },
          ])
          return
        }
        console.error('Failed to submit answer:', (err as Error)?.message ?? err)
      }
    },
    [roundId, currentQuestion, currentPosition, answerState, getElapsedMs, getActiveScoringTimerSnapshot, timeRemainingMs, selectOption, availableShields, submitAnswer, setShields, play, resetAnswerState]
  )

  // Advance to next question or end round
  const handleNextQuestion = useCallback(async () => {
    if (!pendingResult) return
    if (pendingResult.isRoundOver) {
      // Sudden death: batch complete without dying → chain next batch
      if (isSuddenDeath && pendingResult.livesRemaining > 0) {
        await handleBatchComplete()
      } else {
        await handleRoundEnd(pendingResult.livesRemaining)
      }
    } else {
      // Slide current question out to the left
      Animated.parallel([
        Animated.timing(questionTranslateX, {
          toValue: -40,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(questionOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        advanceQuestion()
        setEliminatedOptions({})
        if (!isBlitz) setTimeRemainingMs(GAME_CONFIG.TIMER_SECONDS * 1000)
        hasTimedOutRef.current = false
        startQuestionTimer()
        // Position next question off-screen right, then slide in
        questionTranslateX.setValue(40)
        Animated.parallel([
          Animated.timing(questionTranslateX, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(questionOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start()
      })
    }
  }, [pendingResult, handleRoundEnd, advanceQuestion, startQuestionTimer, questionTranslateX, questionOpacity, isBlitz])

  // Timer tick
  useEffect(() => {
    if (isPaused || answerState !== 'idle') {
      clearInterval(timerRef.current!)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeRemainingMs((prev) => {
        const next = prev - TICK_INTERVAL
        if (next <= 0 && !hasTimedOutRef.current) {
          hasTimedOutRef.current = true
          clearInterval(timerRef.current!)
          if (isBlitz) {
            // Global timer expired — end the round (non-zero lives → results screen)
            handleRoundEnd(1)
          } else {
            handleSubmit(null)
          }
          return 0
        }
        return Math.max(0, next)
      })
    }, TICK_INTERVAL)

    return () => clearInterval(timerRef.current!)
  }, [isPaused, answerState, currentPosition, handleSubmit, isBlitz, handleRoundEnd])

  // Reset timer on new question (blitz keeps the global countdown running)
  useEffect(() => {
    if (!isBlitz) setTimeRemainingMs(GAME_CONFIG.TIMER_SECONDS * 1000)
    hasTimedOutRef.current = false
    startQuestionTimer()
  }, [currentPosition])

  // Play game-start sound once on mount
  useEffect(() => { play('gameStart') }, [])

  // Blitz: auto-advance to next question after reveal
  useEffect(() => {
    if (!isBlitz || answerState !== 'revealed') return
    const timer = setTimeout(handleNextQuestion, 1200)
    return () => clearTimeout(timer)
  }, [isBlitz, answerState, handleNextQuestion])

  // Handle app going to background: forfeit question if one is active, otherwise pause
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        // If a question is being asked, forfeit it immediately by submitting null
        if (answerState === 'idle') {
          handleSubmit(null)
        } else {
          // Otherwise just pause
          pauseGame()
        }
      }
    })
    return () => sub.remove()
  }, [pauseGame, answerState, handleSubmit])

  const handleQuit = () => {
    clearInterval(timerRef.current!)
    resetGame()
    router.replace('/(tabs)/home')
  }

  if (!currentQuestion) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading question...</Text>
        </View>
      </ScreenWrapper>
    )
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LivesDisplay
              livesRemaining={livesRemaining}
              shieldsRemaining={availableShields}
              shieldBreakToken={shieldBreakToken}
            />
            {!isBlitz && <HammersDisplay
              hammers={hammers}
              canUse={hammers > 0 && answerState === 'idle' && Object.keys(eliminatedOptions).length === 0 && !hammerMutation.isPending}
              onUse={async () => {
                if (!roundId || !currentQuestion || hammerMutation.isPending) return
                try {
                  const result = await hammerMutation.mutateAsync({
                    roundId,
                    questionId: currentQuestion.questionId,
                    position: currentPosition,
                  })
                  if (result.eliminatedOptions.length !== 2) {
                    Alert.alert('Hammer missed', 'Could not remove two answers. Try the next question.')
                    return
                  }
                  play('hammer')
                  setEliminatedOptions(
                    result.eliminatedOptions.reduce<Partial<Record<AnswerOption, EliminationEffect>>>((acc, opt) => {
                      acc[opt] = 'hammer'
                      return acc
                    }, {})
                  )
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Could not use hammer. Try again.'
                  Alert.alert('Hammer unavailable', message)
                }
              }}
            />}
          </View>
          <View style={styles.xpWrapper}>
            <Text style={styles.xpLabel}>XP</Text>
            <Animated.View style={{ transform: [{ scale: xpScale }] }}>
              <Animated.View style={[styles.xpGlow, { opacity: xpGlowOpacity }]} pointerEvents="none" />
              <Animated.Text style={styles.xpValue}>
                +{displayXp}
              </Animated.Text>
            </Animated.View>
            {answerState === 'revealed' && pendingResult?.isCorrect && pendingResult.xpGained > 0 && (
              <FloatingXpPopup
                key={pendingResult.position}
                xpGained={pendingResult.xpGained}
                breakdown={pendingResult.xpBreakdown}
              />
            )}
          </View>
          <AnimatedPressable
            onPress={pauseGame}
            style={styles.pauseBtn}
            disabled={answerState !== 'revealed'}
            accessibilityLabel="Pause game"
            // Icon is 20px inside 8px padding — pad the rest of the way to the
            // 44px minimum touch target without changing the header layout.
            hitSlop={8}
          >
            <AppIcon
              name="pause"
              size={20}
              style={answerState !== 'revealed' ? styles.pauseIconDisabled : undefined}
            />
          </AnimatedPressable>
        </View>

        {/* Timer */}
        <TimerBar
          timeRemainingMs={timeRemainingMs}
          isPaused={isPaused}
          totalMs={isBlitz ? BLITZ_MS : undefined}
        />

        {/* XP progress bar */}
        {!isSuddenDeath && profile && (
          <RoundXpBar
            currentXp={profile.xp}
            level={profile.level}
            xpEarnedInRound={xpEarnedInRound}
          />
        )}

        {/* Streak + sudden death question counter */}
        <View style={styles.streakRow}>
          <StreakIndicator streak={streak} />
          {isSuddenDeath && absoluteQuestion !== null && (
            <Text style={[styles.sdCounter, { color: selectedDifficulty === 'hard' ? colors.hard : selectedDifficulty === 'medium' ? colors.medium : colors.easy }]}>
              Q{absoluteQuestion} · {(selectedDifficulty ?? 'easy').toUpperCase()}
            </Text>
          )}
        </View>

        {/* Question + revealed content — animated on advance */}
        <Animated.View
          style={[
            styles.questionArea,
            { opacity: questionOpacity, transform: [{ translateX: questionTranslateX }] },
          ]}
        >
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ProgressDots answerHistory={answerHistory} currentPosition={currentPosition} />
            <QuestionCard
              question={currentQuestion}
              category={selectedCategory ?? undefined}
              difficulty={selectedDifficulty ?? undefined}
              answerState={answerState}
              selectedOption={selectedOption}
              correctOption={pendingResult?.correctOption ?? null}
              eliminatedOptions={eliminatedOptions}
              onSelectOption={(opt) => {
                if (answerState === 'idle') handleSubmit(opt)
              }}
            />

            {/* Explanation + Next/Flag actions — shown after answer is revealed */}
            {answerState === 'revealed' && (
              <RevealActions
                pendingResult={pendingResult}
                isSuddenDeath={isSuddenDeath}
                flagged={flaggedQuestionIds.has(currentQuestion.questionId)}
                onNext={handleNextQuestion}
                onToggleFlag={() => {
                  const qId = currentQuestion.questionId
                  if (flagQuestion.isPending || unflagQuestion.isPending) return
                  if (flaggedQuestionIds.has(qId)) {
                    unflagQuestion.mutate(qId)
                  } else {
                    flagQuestion.mutate(qId)
                  }
                }}
              />
            )}
          </ScrollView>
        </Animated.View>
      </View>

      <PauseModal
        visible={isPaused}
        xp={displayedXp}
        onResume={resumeGame}
        onQuit={handleQuit}
      />

      <ExtraLifeOverlay
        visible={showExtraLife}
        onDismiss={() => setShowExtraLife(false)}
      />
      <HammerEarnedOverlay
        visible={showHammerEarned}
        onDismiss={() => setShowHammerEarned(false)}
      />

      <ConfettiCannon
        ref={confettiRef}
        count={20}
        origin={{ x: 200, y: 0 }}
        autoStart={false}
        fadeOut
        explosionSpeed={180}
        fallSpeed={3500}
        colors={[colors.primary, colors.gold, colors.correct]}
      />

      {/* Streak milestone toast — floats above gameplay, non-blocking */}
      {streakMilestone && (
        <View pointerEvents="none" style={styles.milestoneContainer}>
          <StreakMilestoneToast
            key={streakMilestone.key}
            icon={streakMilestone.icon}
            label={streakMilestone.label}
            color={streakMilestone.color}
            onDone={() => setStreakMilestone(null)}
          />
        </View>
      )}

      {/* Blitz time bonus toast */}
      {blitzBonusKey !== null && (
        <View pointerEvents="none" style={styles.milestoneContainer}>
          <StreakMilestoneToast
            key={blitzBonusKey}
            icon="timer"
            label="+5s"
            color={colors.timerNormal}
            onDone={() => setBlitzBonusKey(null)}
          />
        </View>
      )}

      {/* Correct answer screen glow — edges pulse green, fades out */}
      <Animated.View
        pointerEvents="none"
        style={[styles.correctGlow, { opacity: correctGlowOpacity }]}
      />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'column', gap: spacing.xs },
  xpWrapper: { alignItems: 'center', position: 'relative' },
  xpLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0 },
  xpValue: { fontSize: fontSize.xxl, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  xpGlow: { position: 'absolute', top: -12, left: -16, right: -16, bottom: -12, borderRadius: 16, backgroundColor: colors.primary },
  pauseBtn: { padding: spacing.sm },
  pauseIconDisabled: { opacity: 0.4 },
  streakRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sdCounter: { fontSize: fontSize.sm, fontWeight: '800', letterSpacing: 1 },
  questionArea: { flex: 1 },
  scrollArea: { flex: 1 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.xl },
  loadingText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  milestoneContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -80, // bias upward so it floats above the question card
  },
  correctGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: colors.correct,
    borderRadius: 12,
    // iOS: soft halo spreads inward from the border
    ...Platform.select({
      ios: {
        shadowColor: colors.correct,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 18,
      },
    }),
  },
})
