export interface UserProfile {
  id: string
  displayName: string
  isAnonymous: boolean
  level: number
  xp: number
  xpToNextLevel: number
  coins: number
  inventory_lives: number
  inventory_hammers: number
  inventory_shields: number
  inventory_xp_booster: number
  equipped_lives: number
  equipped_hammers: number
  equipped_shields: number
  equipped_xp_booster: number
  totalGames: number
  totalCorrect: number
  bestXp: number
  accuracy: number
  createdAt: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface UserAchievement extends Achievement {
  earnedAt: string
}

export interface XpAwardBreakdown {
  answerBase: number
  speedBonus: number
  difficultyBonus: number
  streakBonus: number
  answerXp: number
  completionBonus: number
  perfectBonus: number
  noLivesLostBonus: number
  dailyChallengeBonus: number
  firstRoundBonus: number
  total: number
}

export interface XpSubmissionResult {
  submissionId: string
  roundXp: number
  correctCount: number
  xpEarned: number
  coinsEarned?: number
  newCoins?: number
  newXp: number
  newLevel: number
  leveledUp: boolean
  newBestXp: boolean
  rank: number
  xpToNextLevel: number
  xpBreakdown?: XpAwardBreakdown
  newAchievements: Achievement[]
  sessionXpEarned: number
  sessionCorrectCount: number
  sessionRound: number
}
