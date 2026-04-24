export const AVATAR_STAGES = [
  { minLevel: 1,  emoji: '🌱', title: 'Curious',       color: '#4CAF50' },
  { minLevel: 5,  emoji: '🌿', title: 'Apprentice',    color: '#66BB6A' },
  { minLevel: 10, emoji: '⭐', title: 'Scholar',       color: '#FFC107' },
  { minLevel: 20, emoji: '🔥', title: 'Strategist',    color: '#FF5722' },
  { minLevel: 30, emoji: '🌙', title: 'Sage',          color: '#3F51B5' },
  { minLevel: 40, emoji: '🌌', title: 'Mastermind',    color: '#1A237E' },
  { minLevel: 50, emoji: '👑', title: 'Trivia Legend', color: '#B71C1C' },
] as const

export function getAvatarStage(level: number) {
  for (let i = AVATAR_STAGES.length - 1; i >= 0; i--) {
    if (level >= AVATAR_STAGES[i].minLevel) return AVATAR_STAGES[i]
  }
  return AVATAR_STAGES[0]
}

export const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   '#4CAF50',
  medium: '#FF9800',
  hard:   '#F44336',
}

// Map layout constants
export const NODE_COL_WIDTH = 130
export const NODE_ROW_HEIGHT = 150
export const NODE_SIZE = 80
export const MAP_PADDING = 40
