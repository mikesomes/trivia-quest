import { useGameStore } from '../../src/store/gameStore'

// Reset store between tests
beforeEach(() => {
  useGameStore.getState().resetGame()
})

const mockQuestion = {
  position: 0,
  questionId: 'q1',
  questionText: 'What is 2+2?',
  options: { a: '3', b: '4', c: '5', d: '6' },
}

const mockQuestions = Array.from({ length: 10 }, (_, i) => ({
  ...mockQuestion,
  position: i,
  questionId: `q${i}`,
}))

describe('gameStore', () => {
  it('starts in clean state', () => {
    const state = useGameStore.getState()
    expect(state.roundId).toBeNull()
    expect(state.xpEarnedInRound).toBe(0)
    expect(state.livesRemaining).toBe(3)
    expect(state.streak).toBe(0)
  })

  it('sets category and difficulty', () => {
    const { setCategory, setDifficulty } = useGameStore.getState()
    setCategory('science')
    setDifficulty('medium')
    expect(useGameStore.getState().selectedCategory).toBe('science')
    expect(useGameStore.getState().selectedDifficulty).toBe('medium')
  })

  it('startRound sets all round state', () => {
    const { startRound } = useGameStore.getState()
    startRound('round-1', mockQuestions, 3, 0, 0)
    const state = useGameStore.getState()
    expect(state.roundId).toBe('round-1')
    expect(state.questions).toHaveLength(10)
    expect(state.livesRemaining).toBe(3)
    expect(state.scoringTimerMode).toBe('question')
  })

  it('selectOption sets selectedOption and answerState', () => {
    useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0)
    useGameStore.getState().selectOption('b')
    expect(useGameStore.getState().selectedOption).toBe('b')
    expect(useGameStore.getState().answerState).toBe('pending')
  })

  it('recordAnswer updates XP, streak, lives', () => {
    useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0)

    const mockAnswerResult = {
      position: 0,
      questionId: 'q0',
      selectedOption: 'b' as const,
      correctOption: 'b' as const,
      isCorrect: true,
      isTimeout: false,
      xpAwarded: 10,
      currentRoundXp: 10,
      currentStreak: 1,
      livesRemaining: 2,
      hammersRemaining: 0,
      nextPosition: 1,
      isRoundOver: false,
      lifeEarned: false,
      hammerEarned: false,
      explanation: null,
      xpGained: 10,
    }

    useGameStore.getState().recordAnswer(mockAnswerResult)
    const state = useGameStore.getState()
    expect(state.streak).toBe(1)
    expect(state.livesRemaining).toBe(2)
    expect(state.xpEarnedInRound).toBe(10)
    // currentPosition is NOT updated by recordAnswer (see advanceQuestion)
    expect(state.currentPosition).toBe(0)
  })

  it('resetGame clears all state', () => {
    useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0)
    useGameStore.getState().resetGame()
    const state = useGameStore.getState()
    expect(state.roundId).toBeNull()
    expect(state.xpEarnedInRound).toBe(0)
  })

  it('pause and resume toggle isPaused', () => {
    useGameStore.getState().pauseGame()
    expect(useGameStore.getState().isPaused).toBe(true)
    useGameStore.getState().resumeGame()
    expect(useGameStore.getState().isPaused).toBe(false)
  })

  it('builds a question timer snapshot from the visible countdown', () => {
    useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0)
    const snapshot = useGameStore.getState().getActiveScoringTimerSnapshot(9000)

    expect(snapshot).toEqual({
      mode: 'question',
      durationMs: 15000,
      elapsedMs: 6000,
      remainingMs: 9000,
    })
  })

  it('builds a round timer snapshot for blitz rounds', () => {
    useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0, 1, 0, 'round')
    const snapshot = useGameStore.getState().getActiveScoringTimerSnapshot(42000)

    expect(snapshot).toEqual({
      mode: 'round',
      durationMs: 45000,
      elapsedMs: 3000,
      remainingMs: 42000,
    })
  })

  describe('hammer state', () => {
    it('startRound initializes hammers to the provided count', () => {
      useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0, 2)
      expect(useGameStore.getState().hammers).toBe(2)
    })

    it('startRound defaults hammers to the starting hammer count when omitted', () => {
      useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0)
      expect(useGameStore.getState().hammers).toBe(1)
    })

    it('recordAnswer updates hammers from hammersRemaining in result', () => {
      useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0, 3)

      const mockAnswerResult = {
        position: 0,
        questionId: 'q0',
        selectedOption: 'b' as const,
        correctOption: 'b' as const,
        isCorrect: true,
        isTimeout: false,
        xpAwarded: 10,
        currentRoundXp: 10,
        currentStreak: 1,
        livesRemaining: 3,
        hammersRemaining: 2,
        nextPosition: 1,
        isRoundOver: false,
        lifeEarned: false,
        hammerEarned: false,
        explanation: null,
        xpGained: 10,
      }

      useGameStore.getState().recordAnswer(mockAnswerResult)
      expect(useGameStore.getState().hammers).toBe(2)
    })

    it('resetGame resets hammers to 0', () => {
      useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0, 5)
      useGameStore.getState().resetGame()
      expect(useGameStore.getState().hammers).toBe(0)
    })
  })

  describe('shield state', () => {
    it('startRound initializes shields to the provided count', () => {
      useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0, 1, 0, 'question', 1)
      expect(useGameStore.getState().shields).toBe(1)
    })

    it('startRound defaults shields to 0 when omitted', () => {
      useGameStore.getState().startRound('r1', mockQuestions, 3, 0, 0)
      expect(useGameStore.getState().shields).toBe(0)
    })

    it('setShields clamps shields to a non-negative integer', () => {
      useGameStore.getState().setShields(-2.4)
      expect(useGameStore.getState().shields).toBe(0)

      useGameStore.getState().setShields(1.9)
      expect(useGameStore.getState().shields).toBe(1)
    })
  })
})
