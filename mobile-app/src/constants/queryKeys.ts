export const queryKeys = {
  profile: {
    all: () => ['profile'] as const,
    detail: (userId: string) => ['profile', userId] as const,
  },
  round: {
    questions: (roundId: string) => ['round', 'questions', roundId] as const,
    result: (roundId: string) => ['round', 'result', roundId] as const,
  },
  leaderboard: {
    all: () => ['leaderboard'] as const,
    list: (mode: string, period: string, category?: string | null) =>
      ['leaderboard', mode, period, category ?? null] as const,
  },
  dailyChallenge: {
    status: () => ['daily-challenge', 'status'] as const,
  },
  challenges: {
    list: () => ['challenges'] as const,
  },
} as const
