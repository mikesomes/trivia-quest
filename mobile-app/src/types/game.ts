export type Category =
  | 'general_knowledge'
  | 'history'
  | 'science'
  | 'sports'
  | 'movies_tv'
  | 'geography'
  | 'nfl_football'
  | 'roman_history'
  | 'harry_potter'
  | 'famous_quotes'
  | 'music'
  | 'odd_one_out'
  | 'video_games'
  | 'art_history'
  | 'movie_quotes'
  | 'pop_culture'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type ScoringTimerMode = 'question' | 'round'

export type AnswerOption = 'a' | 'b' | 'c' | 'd'

export type AnswerState = 'idle' | 'pending' | 'revealed'

export interface QuestionOptions {
  a: string
  b: string
  c: string
  d: string
}

export interface Question {
  position: number
  questionId: string
  questionText: string
  options: QuestionOptions
  difficulty?: Difficulty
}

export interface ActiveScoringTimerSnapshot {
  mode: ScoringTimerMode
  durationMs: number
  elapsedMs: number
  remainingMs: number
}

export interface AnswerXpBreakdown {
  base: number
  timeBonus: number
  difficultyBonus: number
  streakBonus: number
  difficultyMultiplier: number
  comboMultiplier: number
  total: number
  timing: ActiveScoringTimerSnapshot
}

export interface ShieldBreakResult {
  shieldConsumed: true
  blockedOption: AnswerOption
  shieldsRemaining: number
}

export interface AnswerResult {
  position: number
  questionId: string
  selectedOption: AnswerOption | null
  correctOption: AnswerOption
  isCorrect: boolean
  isTimeout: boolean
  xpAwarded: number
  xpBreakdown?: AnswerXpBreakdown
  currentRoundXp: number
  currentStreak: number
  livesRemaining: number
  hammersRemaining: number
  nextPosition: number
  isRoundOver: boolean
  lifeEarned: boolean
  hammerEarned: boolean
  timeBonus?: number
  explanation: string | null
  // Quest mode only
  xpGained: number
  newXp?: number
  newLevel?: number
  leveledUp?: boolean
}

export type SubmitAnswerResult = AnswerResult | ShieldBreakResult

export function isShieldBreakResult(result: SubmitAnswerResult): result is ShieldBreakResult {
  return 'shieldConsumed' in result && result.shieldConsumed === true
}

export interface RoundResult {
  roundId: string
  category: Category
  difficulty: Difficulty
  xpEarned: number
  xpBoosterApplied?: boolean
  correctCount: number
  totalQuestions: number
  livesRemaining: number
  longestStreak: number
  answers: Array<{
    position: number
    questionId: string
    selectedOption: AnswerOption | null
    correctOption: AnswerOption
    isCorrect: boolean
    xpAwarded: number
    timeTakenMs: number
    breakdown: { speedBonus: number; streakBonus: number }
  }>
  bonusSummary: {
    totalAnswerXp: number
    totalSpeedBonus: number
    totalStreakBonus: number
  }
}
