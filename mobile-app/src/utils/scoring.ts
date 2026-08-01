// Client-side XP mirror — must stay in sync with backend _shared/scoring.ts
// Used only for UI preview; backend XP is authoritative

import { GAME_CONFIG, LEVEL_PERKS } from '../constants/game'
import type { LevelPerk } from '../constants/game'
import type { ActiveScoringTimerSnapshot, ScoringTimerMode } from '../types/game'

export const MAX_PLAYER_LEVEL = 50
export const EASY_BASE_ANSWER_XP = 10
export const XP_BASE_BY_DIFFICULTY = {
  easy: 10,
  medium: 15,
  hard: 25,
  boss: 40,
} as const

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
    ? GAME_CONFIG.BLITZ_SECONDS * 1000
    : GAME_CONFIG.TIMER_SECONDS * 1000
}

export function createActiveScoringTimerSnapshot(params: {
  mode: ScoringTimerMode
  durationMs?: number
  elapsedMs?: number
  remainingMs?: number
}): ActiveScoringTimerSnapshot {
  const durationMs = getScoringTimerDurationMs(params.mode)
  const remainingFromInput = typeof params.remainingMs === 'number'
    ? params.remainingMs
    : durationMs - (params.elapsedMs ?? durationMs)
  const remainingMs = clampInt(remainingFromInput, 0, durationMs)

  return {
    mode: params.mode,
    durationMs,
    elapsedMs: durationMs - remainingMs,
    remainingMs,
  }
}

export function computeAnswerXp(params: {
  isCorrect: boolean
  activeTimer: ActiveScoringTimerSnapshot
  currentStreak: number
  difficulty: string
}): {
  base: number
  timeBonus: number
  difficultyBonus: number
  streakBonus: number
  difficultyMultiplier: number
  comboMultiplier: number
  total: number
  newStreak: number
  timing: ActiveScoringTimerSnapshot
} {
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
  const difficultyBonus = Math.max(0, difficultyBase - EASY_BASE_ANSWER_XP)
  const beforeStreak = EASY_BASE_ANSWER_XP + difficultyBonus + timeBonus
  const total = Math.floor(beforeStreak * comboMultiplier)
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

export function computeXpEarned(
  correctCount: number,
  difficulty: 'easy' | 'medium' | 'hard',
  totalQuestions: number
): number {
  const multipliers = { easy: 1.0, medium: 1.5, hard: 2.0 }
  const isPerfect = correctCount === totalQuestions
  return Math.floor((correctCount * 10 + 50 + (isPerfect ? 100 : 0)) * multipliers[difficulty])
}

export function levelFromXp(totalXp: number): number {
  let level = 1
  while (level < MAX_PLAYER_LEVEL && xpRequiredForLevel(level + 1) <= totalXp) {
    level++
  }
  return level
}

export function xpForNextLevel(level: number): number {
  return Math.floor(75 + level * 45 + Math.pow(level, 1.65) * 18)
}

export function xpRequiredForLevel(n: number): number {
  if (n <= 1) return 0
  const targetLevel = Math.min(n, MAX_PLAYER_LEVEL)
  let total = 0
  for (let i = 1; i < targetLevel; i++) total += xpForNextLevel(i)
  return total
}

export function xpToNextLevel(totalXp: number): number {
  const currentLevel = levelFromXp(totalXp)
  if (currentLevel >= MAX_PLAYER_LEVEL) return 0
  return xpRequiredForLevel(currentLevel + 1) - totalXp
}

/**
 * How far through the current level the player is, 0–1. At the level cap there
 * is no next level to progress toward, so the bar reads full.
 */
export function levelProgress(currentXp: number, level: number): number {
  if (level >= MAX_PLAYER_LEVEL) return 1
  const levelStartXp = xpRequiredForLevel(level)
  const levelTotalXp = xpRequiredForLevel(level + 1) - levelStartXp
  if (levelTotalXp <= 0) return 0
  return (currentXp - levelStartXp) / levelTotalXp
}

/** Returns the highest perk tier the player has unlocked for their level. */
export function getPerksForLevel(playerLevel: number): LevelPerk {
  let perk = LEVEL_PERKS[0]
  for (const p of LEVEL_PERKS) {
    if (playerLevel >= p.level) perk = p
    else break
  }
  return perk
}
