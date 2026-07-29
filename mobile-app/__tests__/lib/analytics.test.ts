const mockCapture = jest.fn()
const mockIdentify = jest.fn()
const mockFlush = jest.fn()
const mockConstructor = jest.fn()

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: class {
    constructor(...args: unknown[]) {
      mockConstructor(...args)
    }
    capture = mockCapture
    identify = mockIdentify
    flush = mockFlush
  },
}))

const ORIGINAL_ENV = process.env

function loadAnalytics() {
  let mod!: typeof import('../../src/lib/analytics')
  jest.isolateModules(() => {
    mod = require('../../src/lib/analytics')
  })
  return mod
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

describe('analytics', () => {
  // The important property: a dev or preview session must never send events,
  // or the content-quality numbers are measuring the developer.
  it('does not construct a client outside production', () => {
    process.env.EXPO_PUBLIC_ENV = 'development'
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test'

    const { initAnalytics, analytics } = loadAnalytics()
    initAnalytics()
    analytics.roundStarted({ category: 'history', difficulty: 'easy', gameMode: 'classic' })

    expect(mockConstructor).not.toHaveBeenCalled()
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('does not construct a client when no key is configured', () => {
    process.env.EXPO_PUBLIC_ENV = 'production'
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY

    const { initAnalytics } = loadAnalytics()
    initAnalytics()

    expect(mockConstructor).not.toHaveBeenCalled()
  })

  it('captures content events in production', () => {
    process.env.EXPO_PUBLIC_ENV = 'production'
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test'

    const { initAnalytics, analytics } = loadAnalytics()
    initAnalytics()

    analytics.answerSubmitted({
      questionId: 'q1',
      category: 'history',
      difficulty: 'hard',
      gameMode: 'blitz',
      isCorrect: false,
      timeTakenMs: 4200,
      timedOut: false,
    })

    expect(mockCapture).toHaveBeenCalledWith('answer_submitted', expect.objectContaining({
      questionId: 'q1',
      category: 'history',
      isCorrect: false,
    }))
  })

  it('is a no-op before init rather than throwing', () => {
    process.env.EXPO_PUBLIC_ENV = 'production'
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test'

    const { analytics, identifyUser } = loadAnalytics()

    // Analytics must never be able to break a round.
    expect(() => analytics.questionFlagged({ questionId: 'q', category: 'c', difficulty: 'easy' })).not.toThrow()
    expect(() => identifyUser('user-1')).not.toThrow()
    expect(() => analytics.flush()).not.toThrow()
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('identifies with the supabase user id, and ignores a null id', () => {
    process.env.EXPO_PUBLIC_ENV = 'production'
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test'

    const { initAnalytics, identifyUser } = loadAnalytics()
    initAnalytics()

    identifyUser(null)
    expect(mockIdentify).not.toHaveBeenCalled()

    identifyUser('user-123')
    expect(mockIdentify).toHaveBeenCalledWith('user-123')
  })

  it('swallows errors thrown by the SDK', () => {
    process.env.EXPO_PUBLIC_ENV = 'production'
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test'
    mockCapture.mockImplementation(() => {
      throw new Error('network down')
    })

    const { initAnalytics, analytics } = loadAnalytics()
    initAnalytics()

    expect(() => analytics.bankShortfall({ category: 'odd_one_out', gameMode: 'blitz', reason: 'insufficient' }))
      .not.toThrow()
  })
})
