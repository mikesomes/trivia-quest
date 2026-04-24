export const LEVEL_UNLOCKS = [
  { level: 2, label: 'Daily Challenge', detail: 'A new challenge every day' },
  { level: 3, label: 'Science Category', detail: 'More ways to prove what you know' },
  { level: 5, label: 'Higher Life Cap', detail: 'Quest rounds can hold up to 6 lives' },
  { level: 7, label: 'Medium XP Bonus', detail: 'Medium questions pay better' },
  { level: 8, label: 'Starting Shield', detail: 'Quest rounds begin with 1 shield' },
  { level: 10, label: 'Second Hammer Slot', detail: 'Quest rounds begin with 2 hammers' },
  { level: 15, label: 'Hard Difficulty', detail: 'Bigger risks, bigger XP' },
  { level: 17, label: 'Extra Life Start', detail: 'Quest rounds begin with 4 lives' },
  { level: 20, label: 'Streak Flame', detail: 'A stronger streak identity' },
  { level: 23, label: 'Higher Life Cap II', detail: 'Quest rounds can hold up to 7 lives' },
  { level: 25, label: 'Quest Region II', detail: 'The map opens wider' },
  { level: 30, label: 'Boss Nodes', detail: 'High-stakes knowledge checks' },
  { level: 40, label: 'Third Hammer Slot', detail: 'Quest rounds begin with 3 hammers' },
  { level: 50, label: 'Five-Life Start', detail: 'Quest rounds begin with 5 lives' },
] as const

export const KNOWLEDGE_RANKS = [
  { minLevel: 1, title: 'Curious' },
  { minLevel: 5, title: 'Apprentice' },
  { minLevel: 10, title: 'Scholar' },
  { minLevel: 20, title: 'Strategist' },
  { minLevel: 30, title: 'Sage' },
  { minLevel: 40, title: 'Mastermind' },
  { minLevel: 50, title: 'Trivia Legend' },
] as const

export function getNextLevelUnlock(level: number) {
  return LEVEL_UNLOCKS.find((unlock) => unlock.level > level) ?? null
}

export function getKnowledgeRank(level: number) {
  let rank: (typeof KNOWLEDGE_RANKS)[number] = KNOWLEDGE_RANKS[0]
  for (const candidate of KNOWLEDGE_RANKS) {
    if (level >= candidate.minLevel) rank = candidate
    else break
  }
  return rank
}
