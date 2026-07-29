import { create } from 'zustand'
import type {
  Category,
  Difficulty,
  Question,
  AnswerOption,
  AnswerState,
  AnswerResult,
  ActiveScoringTimerSnapshot,
  ScoringTimerMode,
  RoundResult,
} from '../types/game'
import { GAME_CONFIG } from '../constants/game'
import { createActiveScoringTimerSnapshot } from '../utils/scoring'

interface GameState {
  // Setup
  selectedCategory: Category | null
  selectedDifficulty: Difficulty | null
  roundNumber: number

  // Active round
  roundId: string | null
  questions: Question[]
  currentPosition: number
  scoringTimerMode: ScoringTimerMode

  // Timer (per-question start time, ms since epoch)
  questionStartTime: number | null

  // Accumulating state
  streak: number
  livesRemaining: number
  hammers: number
  shields: number
  answerHistory: AnswerResult[]

  // UI state
  isPaused: boolean
  selectedOption: AnswerOption | null
  answerState: AnswerState

  // Round result
  roundResult: RoundResult | null
  xpResult: import('../types/user').XpSubmissionResult | null

  // Pending answer result (set on reveal, cleared on advance)
  pendingResult: AnswerResult | null

  // Daily challenge
  isDailyChallenge: boolean

  // Quest
  questNodeId: string | null
  questCategoryId: string | null
  questGameMode: string | null
  questRunId: string | null
  xpEarnedInRound: number

  // Sudden death
  isSuddenDeath: boolean
  sdBatchNumber: number    // 0-indexed, increments each completed batch
  sdBaseXp: number         // cumulative XP from all completed batches
  sdRoundIds: string[]     // round IDs for every batch (used for server-side XP verification)

  // Classic session accumulation
  sessionRoundIds: string[] // round IDs of already-submitted rounds in this session (not including current)

  // Blitz
  isBlitz: boolean

  // Actions
  setCategory: (category: Category) => void
  setDifficulty: (difficulty: Difficulty) => void
  setIsDailyChallenge: (val: boolean) => void
  setQuestNode: (nodeId: string, categoryId: string, gameMode: string, runId?: string | null) => void
  setIsSuddenDeath: (val: boolean) => void
  setIsBlitz: (val: boolean) => void
  addSdBatchXp: (batchXp: number) => void
  addSdRoundId: (roundId: string) => void
  addSessionRoundId: (roundId: string) => void
  incrementRound: () => void
  startRound: (
    roundId: string,
    questions: Question[],
    livesRemaining: number,
    streak: number,
    currentPosition: number,
    hammers?: number,
    xpEarnedInRound?: number,
    scoringTimerMode?: ScoringTimerMode,
    shields?: number
  ) => void
  setShields: (shields: number) => void
  startQuestionTimer: () => void
  getElapsedMs: () => number
  getActiveScoringTimerSnapshot: (visibleRemainingMs: number) => ActiveScoringTimerSnapshot
  selectOption: (option: AnswerOption) => void
  recordAnswer: (result: AnswerResult) => void
  advanceQuestion: () => void
  resetAnswerState: () => void
  pauseGame: () => void
  resumeGame: () => void
  resetGame: () => void
  setRoundResult: (result: RoundResult) => void
  setXpResult: (result: import('../types/user').XpSubmissionResult) => void
}

export const useGameStore = create<GameState>()((set, get) => ({
  selectedCategory: null,
  selectedDifficulty: null,
  roundNumber: 1,
  roundId: null,
  questions: [],
  currentPosition: 0,
  scoringTimerMode: 'question',
  questionStartTime: null,
  streak: 0,
  livesRemaining: GAME_CONFIG.STARTING_LIVES,
  hammers: 0,
  shields: GAME_CONFIG.STARTING_SHIELDS,
  answerHistory: [],
  isPaused: false,
  selectedOption: null,
  answerState: 'idle',
  pendingResult: null,
  roundResult: null,
  xpResult: null,
  isDailyChallenge: false,
  questNodeId: null,
  questCategoryId: null,
  questGameMode: null,
  questRunId: null,
  xpEarnedInRound: 0,
  isSuddenDeath: false,
  sdBatchNumber: 0,
  sdBaseXp: 0,
  sdRoundIds: [],
  sessionRoundIds: [],
  isBlitz: false,

  setCategory: (category) => set({ selectedCategory: category }),
  setIsDailyChallenge: (val) => set({ isDailyChallenge: val }),
  setQuestNode: (nodeId, categoryId, gameMode, runId = null) =>
    set({ questNodeId: nodeId, questCategoryId: categoryId, questGameMode: gameMode, questRunId: runId }),
  setIsSuddenDeath: (val) => set({ isSuddenDeath: val }),
  setIsBlitz: (val) => set({ isBlitz: val }),
  addSdBatchXp: (batchXp) => set((state) => ({
    sdBaseXp: state.sdBaseXp + batchXp,
    sdBatchNumber: state.sdBatchNumber + 1,
  })),
  addSdRoundId: (roundId) => set((state) => ({
    sdRoundIds: [...state.sdRoundIds, roundId],
  })),
  addSessionRoundId: (roundId) => set((state) => ({
    sessionRoundIds: [...state.sessionRoundIds, roundId],
  })),
  setDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),
  incrementRound: () => set((state) => ({ roundNumber: state.roundNumber + 1 })),

  startRound: (
    roundId,
    questions,
    livesRemaining,
    streak,
    currentPosition,
    hammers = GAME_CONFIG.STARTING_HAMMERS,
    xpEarnedInRound = 0,
    scoringTimerMode = 'question',
    shields = GAME_CONFIG.STARTING_SHIELDS
  ) => set({
    roundId,
    questions,
    currentPosition,
    scoringTimerMode,
    streak,
    livesRemaining,
    hammers,
    shields,
    xpEarnedInRound,
    answerHistory: [],
    selectedOption: null,
    answerState: 'idle',
    roundResult: null,
    xpResult: null,
    questionStartTime: Date.now(),
  }),

  startQuestionTimer: () => set({ questionStartTime: Date.now() }),

  setShields: (shields) => set({ shields: Math.max(0, Math.floor(shields)) }),

  getElapsedMs: () => {
    const start = get().questionStartTime
    return start ? Date.now() - start : 0
  },

  getActiveScoringTimerSnapshot: (visibleRemainingMs) => {
    const mode = get().scoringTimerMode
    return createActiveScoringTimerSnapshot({
      mode,
      remainingMs: visibleRemainingMs,
    })
  },

  selectOption: (option) => set({ selectedOption: option, answerState: 'pending' }),

  recordAnswer: (result) => set((state) => ({
    answerHistory: [...state.answerHistory, result],
    streak: result.currentStreak,
    livesRemaining: result.livesRemaining,
    hammers: result.hammersRemaining,
    xpEarnedInRound: state.xpEarnedInRound + (result.xpGained ?? 0),
    answerState: 'revealed',
    pendingResult: result,
    // currentPosition and selectedOption are preserved so the answered
    // question stays visible with correct red/green feedback
  })),

  advanceQuestion: () => set((state) => ({
    currentPosition: state.pendingResult?.nextPosition ?? state.currentPosition,
    selectedOption: null,
    answerState: 'idle',
    pendingResult: null,
  })),

  resetAnswerState: () => set({ answerState: 'idle', selectedOption: null }),
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),

  resetGame: () => set({
    roundNumber: 1,
    roundId: null,
    questions: [],
    currentPosition: 0,
    scoringTimerMode: 'question',
    questionStartTime: null,
    streak: 0,
    livesRemaining: GAME_CONFIG.STARTING_LIVES,
    hammers: 0,
    shields: GAME_CONFIG.STARTING_SHIELDS,
    answerHistory: [],
    isPaused: false,
    selectedOption: null,
    answerState: 'idle',
    pendingResult: null,
    roundResult: null,
    xpResult: null,
    isDailyChallenge: false,
    questNodeId: null,
    questCategoryId: null,
    questGameMode: null,
    questRunId: null,
    xpEarnedInRound: 0,
    isSuddenDeath: false,
    sdBatchNumber: 0,
    sdBaseXp: 0,
    sdRoundIds: [],
    sessionRoundIds: [],
    isBlitz: false,
  }),

  setRoundResult: (result) => set({ roundResult: result }),

  setXpResult: (result) => set({ xpResult: result }),
}))
