function coerceNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function formatNumber(value: number | null | undefined): string {
  return coerceNumber(value).toLocaleString()
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatAccuracy(accuracy: number | null | undefined): string {
  return `${Math.round(coerceNumber(accuracy) * 100)}%`
}

export function formatLevel(level: number | null | undefined): string {
  return `Lv.${coerceNumber(level)}`
}

export function formatXp(xp: number | null | undefined): string {
  const safeXp = coerceNumber(xp)
  if (safeXp >= 1000) return `${(safeXp / 1000).toFixed(1)}k XP`
  return `${safeXp} XP`
}

export function pluralize(count: number | null | undefined, word: string): string {
  const safeCount = coerceNumber(count)
  return `${safeCount} ${word}${safeCount === 1 ? '' : 's'}`
}
