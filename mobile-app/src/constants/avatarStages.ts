import type { GameIconName } from '../components/icons'

export const AVATAR_STAGES = [
  { minLevel: 1,  icon: 'seedling' as GameIconName, title: 'Curious',       color: '#4CAF50' },
  { minLevel: 5,  icon: 'leaf' as GameIconName, title: 'Apprentice',    color: '#66BB6A' },
  { minLevel: 10, icon: 'star' as GameIconName, title: 'Scholar',       color: '#FFC107' },
  { minLevel: 20, icon: 'flame' as GameIconName, title: 'Strategist',    color: '#FF5722' },
  { minLevel: 30, icon: 'moon' as GameIconName, title: 'Sage',          color: '#3F51B5' },
  { minLevel: 40, icon: 'cosmos' as GameIconName, title: 'Mastermind',    color: '#1A237E' },
  { minLevel: 50, icon: 'crown' as GameIconName, title: 'Trivia Legend', color: '#B71C1C' },
] as const

export function getAvatarStage(level: number) {
  for (let i = AVATAR_STAGES.length - 1; i >= 0; i--) {
    if (level >= AVATAR_STAGES[i].minLevel) return AVATAR_STAGES[i]
  }
  return AVATAR_STAGES[0]
}
