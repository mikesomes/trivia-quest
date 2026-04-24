import type { LeaderboardEntry, LeaderboardPeriod } from '../types/api'

export type RankDirection = 'up' | 'down' | 'same' | 'new'

export interface RankMovement {
  direction: RankDirection
  delta: number
}

export function getRankMovement(
  currentRank: number,
  previousRank: number | null | undefined,
): RankMovement {
  if (previousRank == null) return { direction: 'new', delta: 0 }
  const delta = previousRank - currentRank
  if (delta > 0) return { direction: 'up', delta }
  if (delta < 0) return { direction: 'down', delta: Math.abs(delta) }
  return { direction: 'same', delta: 0 }
}

export function getXpGapToNextRank(
  userRank: number,
  userXp: number,
  entries: LeaderboardEntry[],
): number | null {
  if (userRank <= 1) return null
  const nextEntry = entries.find((e) => e.rank === userRank - 1)
  if (!nextEntry) return null
  return Math.max(0, nextEntry.primaryValue - userXp)
}

export function getNextRankLabel(
  userRank: number,
  entries: LeaderboardEntry[],
): string | null {
  if (userRank <= 1) return null
  const nextEntry = entries.find((e) => e.rank === userRank - 1)
  return nextEntry ? `#${nextEntry.rank} ${nextEntry.displayName}` : `#${userRank - 1}`
}

export function getWeeklyResetMs(): number {
  const now = new Date()
  const day = now.getUTCDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(now)
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday)
  nextMonday.setUTCHours(0, 0, 0, 0)
  return nextMonday.getTime() - now.getTime()
}

export function getDailyResetMs(): number {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(now.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.getTime() - now.getTime()
}

export function getResetMs(period: LeaderboardPeriod): number | null {
  if (period === 'weekly') return getWeeklyResetMs()
  if (period === 'today') return getDailyResetMs()
  return null
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Resetting…'
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
