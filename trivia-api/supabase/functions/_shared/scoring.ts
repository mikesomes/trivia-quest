// CANONICAL XP MODULE — source of truth for gameplay XP calculations
// The mobile app mirrors this logic in src/utils/scoring.ts for UI preview

import type {
  XpBreakdown,
  RoundXpBreakdown,
  LevelPerk,
  ActiveScoringTimerSnapshot,
  ScoringTimerMode,
} from './types.ts'
import { GAME_CONSTANTS, LEVEL_PERKS } from './types.ts'

export const MAX_PLAYER_LEVEL = 50
export const EASY_BASE_ANSWER_XP = 10
export const XP_BASE_BY_DIFFICULTY = {
  easy: 10,
  medium: 15,
  hard: 25,
  boss: 40,
} as const
const DEFAULT_TIMER_MODE: ScoringTimerMode = 'question'

function streakXpMultiplier(streak: number) {
  if (streak >= 10) return 2.0
  if (streak >= 8) return 1.5
  if (streak >= 5) return 1.25
  if (streak >= 3) return 1.1
  return 1.0
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.floor(value)))
}

export function getScoringTimerDurationMs(mode: ScoringTimerMode): number {
  return mode === 'round'
    ? GAME_CONSTANTS.BLITZ_SECONDS * 1000
    : GAME_CONSTANTS.TIMER_SECONDS * 1000
}

export function createActiveScoringTimerSnapshot(params: {
  mode?: ScoringTimerMode
  durationMs?: number
  elapsedMs?: number
  remainingMs?: number
}): ActiveScoringTimerSnapshot {
  const mode = params.mode ?? DEFAULT_TIMER_MODE
  const durationMs = getScoringTimerDurationMs(mode)
  const remainingFromInput = typeof params.remainingMs === 'number'
    ? params.remainingMs
    : durationMs - (params.elapsedMs ?? durationMs)
  const remainingMs = clampInt(remainingFromInput, 0, durationMs)

  return {
    mode,
    durationMs,
    elapsedMs: durationMs - remainingMs,
    remainingMs,
  }
}

export function getDifficultyBonusXp(difficulty: string): number {
  const difficultyBase = XP_BASE_BY_DIFFICULTY[difficulty as keyof typeof XP_BASE_BY_DIFFICULTY] ?? XP_BASE_BY_DIFFICULTY.medium
  return Math.max(0, difficultyBase - EASY_BASE_ANSWER_XP)
}

/**
 * Compute XP for a single answer. XP is the primary progression reward:
 * speed and difficulty raise the pre-streak value, then streak multiplies it.
 */
export function computeAnswerXp(params: {
  isCorrect: boolean
  activeTimer: ActiveScoringTimerSnapshot
  currentStreak: number
  difficulty: string
}): XpBreakdown {
  const timing = createActiveScoringTimerSnapshot(params.activeTimer)

  if (!params.isCorrect) {
    return {
      base: 0,
      timeBonus: 0,
      difficultyBonus: 0,
      streakBonus: 0,
      difficultyMultiplier: 1.0,
      comboMultiplier: 1.0,
      total: 0,
      newStreak: 0,
      timing,
    }
  }

  const difficultyBase = XP_BASE_BY_DIFFICULTY[params.difficulty as keyof typeof XP_BASE_BY_DIFFICULTY] ?? XP_BASE_BY_DIFFICULTY.medium
  const timeBonus = Math.floor(difficultyBase * 0.5 * (timing.remainingMs / timing.durationMs))
  const newStreak = params.currentStreak + 1
  const comboMultiplier = streakXpMultiplier(newStreak)
  const difficultyMultiplier = difficultyBase / EASY_BASE_ANSWER_XP
  const baseWithDifficulty = EASY_BASE_ANSWER_XP + Math.max(0, difficultyBase - EASY_BASE_ANSWER_XP)
  const beforeStreak = baseWithDifficulty + timeBonus
  const total = Math.floor(beforeStreak * comboMultiplier)
  const difficultyBonus = Math.max(0, difficultyBase - EASY_BASE_ANSWER_XP)
  const streakBonus = Math.max(0, total - beforeStreak)

  return {
    base: EASY_BASE_ANSWER_XP,
    timeBonus,
    difficultyBonus,
    streakBonus,
    difficultyMultiplier,
    comboMultiplier,
    total,
    newStreak,
    timing,
  }
}

/**
 * Compute legacy XP earned from a completed round.
 */
export function computeXpEarned(
  correctCount: number,
  difficulty: 'easy' | 'medium' | 'hard',
  totalQuestions: number
): number {
  const multipliers = { easy: 1.0, medium: 1.5, hard: 2.0 }
  const isPerfect = correctCount === totalQuestions
  const perfectBonus = isPerfect ? 100 : 0
  const base = correctCount * 10 + 50 + perfectBonus
  return Math.floor(base * multipliers[difficulty])
}

/**
 * Bonus XP awarded when a round is submitted.
 */
export function computeRoundXpBreakdown(params: {
  answerBase: number
  speedBonus: number
  difficultyBonus: number
  streakBonus: number
  answeredCount: number
  correctCount: number
  totalQuestions: number
  livesRemaining: number
  isDailyChallenge?: boolean
  isFirstRoundToday?: boolean
}): RoundXpBreakdown {
  const answeredAll = params.answeredCount >= params.totalQuestions
  const perfect = answeredAll && params.correctCount === params.totalQuestions
  const answerXp = params.answerBase + params.speedBonus + params.difficultyBonus + params.streakBonus
  const completionBonus = answeredAll ? 50 : 0
  const perfectBonus = perfect ? 100 : 0
  const noLivesLostBonus = perfect && params.livesRemaining >= GAME_CONSTANTS.STARTING_LIVES ? 50 : 0
  const dailyChallengeBonus = params.isDailyChallenge && answeredAll ? 75 : 0
  const firstRoundBonus = params.isFirstRoundToday && answeredAll ? 100 : 0
  const total = answerXp + completionBonus + perfectBonus + noLivesLostBonus + dailyChallengeBonus + firstRoundBonus

  return {
    answerBase: params.answerBase,
    speedBonus: params.speedBonus,
    difficultyBonus: params.difficultyBonus,
    streakBonus: params.streakBonus,
    answerXp,
    completionBonus,
    perfectBonus,
    noLivesLostBonus,
    dailyChallengeBonus,
    firstRoundBonus,
    total,
  }
}

/**
 * XP required to advance from `level` to `level + 1`.
 */
export function xpForNextLevel(level: number): number {
  return Math.floor(75 + level * 45 + Math.pow(level, 1.65) * 18)
}

/**
 * Compute level from total XP using a smooth capped curve.
 */
export function levelFromXp(totalXp: number): number {
  let level = 1
  while (level < MAX_PLAYER_LEVEL && xpRequiredForLevel(level + 1) <= totalXp) {
    level++
  }
  return level
}

/**
 * Total XP required to reach level n (from 0).
 */
export function xpRequiredForLevel(n: number): number {
  if (n <= 1) return 0
  const targetLevel = Math.min(n, MAX_PLAYER_LEVEL)
  let total = 0
  for (let i = 1; i < targetLevel; i++) {
    total += xpForNextLevel(i)
  }
  return total
}

/**
 * XP needed to reach the next level from current total XP.
 */
export function xpToNextLevel(totalXp: number): number {
  const currentLevel = levelFromXp(totalXp)
  if (currentLevel >= MAX_PLAYER_LEVEL) return 0
  return xpRequiredForLevel(currentLevel + 1) - totalXp
}

/**
 * Returns the highest perk tier the player has unlocked for their level.
 */
export function getPerksForLevel(playerLevel: number): LevelPerk {
  let perk = LEVEL_PERKS[0]
  for (const p of LEVEL_PERKS) {
    if (playerLevel >= p.level) perk = p
    else break
  }
  return perk
}
