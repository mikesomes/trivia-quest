import { apiGet, apiPost } from './client'
import type { UserProfile } from '../types/user'
import { levelFromXp, xpToNextLevel } from '../utils/scoring'

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function normalizeUserProfile(profile: Partial<UserProfile> | null | undefined): UserProfile {
  const xp = coerceNumber(profile?.xp)
  const derivedLevel = levelFromXp(xp)
  const level = Math.max(1, Math.floor(coerceNumber(profile?.level, derivedLevel)))

  return {
    id: profile?.id ?? '',
    displayName: profile?.displayName ?? 'Player',
    isAnonymous: profile?.isAnonymous ?? true,
    level,
    xp,
    xpToNextLevel: Math.max(0, Math.floor(coerceNumber(profile?.xpToNextLevel, xpToNextLevel(xp)))),
    coins: Math.max(0, Math.floor(coerceNumber(profile?.coins))),
    inventory_lives:       Math.max(0, Math.floor(coerceNumber(profile?.inventory_lives))),
    inventory_hammers:     Math.max(0, Math.floor(coerceNumber(profile?.inventory_hammers))),
    inventory_shields:     Math.max(0, Math.floor(coerceNumber(profile?.inventory_shields))),
    inventory_xp_booster:  Math.max(0, Math.floor(coerceNumber(profile?.inventory_xp_booster))),
    equipped_lives:        Math.max(0, Math.floor(coerceNumber(profile?.equipped_lives))),
    equipped_hammers:      Math.max(0, Math.floor(coerceNumber(profile?.equipped_hammers))),
    equipped_shields:      Math.max(0, Math.floor(coerceNumber(profile?.equipped_shields))),
    equipped_xp_booster:   Math.max(0, Math.floor(coerceNumber(profile?.equipped_xp_booster))),
    totalGames: Math.max(0, Math.floor(coerceNumber(profile?.totalGames))),
    totalCorrect: Math.max(0, Math.floor(coerceNumber(profile?.totalCorrect))),
    bestXp: Math.max(0, Math.floor(coerceNumber(profile?.bestXp))),
    accuracy: Math.max(0, Math.min(1, coerceNumber(profile?.accuracy))),
    createdAt: profile?.createdAt ?? '',
    dayStreak: Math.max(0, Math.floor(coerceNumber(profile?.dayStreak))),
    longestDayStreak: Math.max(0, Math.floor(coerceNumber(profile?.longestDayStreak))),
    streakFreezes: Math.max(0, Math.floor(coerceNumber(profile?.streakFreezes))),
    lastActiveDate: profile?.lastActiveDate ?? null,
  }
}

export const profileApi = {
  get: async () => normalizeUserProfile(await apiGet<Partial<UserProfile>>('/get-profile')),
  setDisplayName: (displayName: string) =>
    apiPost<{ displayName: string }>('/update-profile', { displayName }),
}
