import type { GameIconName } from '../components/icons'

/**
 * The seven ranks a player passes through, lowest first.
 *
 * On colors: every stage tint has to survive being drawn on `#0f0f1a`, so
 * these are picked for luminance first and hue second. The old ramp used stock
 * Material values — `#1A237E` at Mastermind was so dark it read as a hole in
 * the screen, and `#B71C1C` at Legend went muddy. Each tint here is lifted
 * enough to stay legible while keeping the hue its glyph implies: growth greens
 * → a scholarly gold → an ember → cool night blues → violet → a final rose.
 *
 * Chroma also climbs with rank, so late stages feel richer than early ones
 * without anything needing to shout.
 */
export const AVATAR_STAGES = [
  { minLevel: 1,  icon: 'seedling',   title: 'Curious',       color: '#6FCF97' },
  { minLevel: 5,  icon: 'leaf',       title: 'Apprentice',    color: '#45C4A6' },
  { minLevel: 10, icon: 'scholar',    title: 'Scholar',       color: '#E8C46A' },
  { minLevel: 20, icon: 'strategist', title: 'Strategist',    color: '#EF8455' },
  { minLevel: 30, icon: 'moon',       title: 'Sage',          color: '#8AA4F2' },
  { minLevel: 40, icon: 'cosmos',     title: 'Mastermind',    color: '#A87BF2' },
  { minLevel: 50, icon: 'crown',      title: 'Trivia Legend', color: '#EC6A8C' },
] as const satisfies readonly {
  minLevel: number
  icon: GameIconName
  title: string
  color: string
}[]

/** How many ranks exist — the emblem's decoration ladder is keyed to this. */
export const AVATAR_TIER_COUNT = AVATAR_STAGES.length

export function getAvatarStage(level: number) {
  return AVATAR_STAGES[getAvatarTier(level)]
}

/** Index into `AVATAR_STAGES` — 0 at level 1, `AVATAR_TIER_COUNT - 1` at cap. */
export function getAvatarTier(level: number): number {
  for (let i = AVATAR_STAGES.length - 1; i >= 0; i--) {
    if (level >= AVATAR_STAGES[i].minLevel) return i
  }
  return 0
}
