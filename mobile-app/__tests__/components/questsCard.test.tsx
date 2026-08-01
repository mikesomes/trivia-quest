import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { QuestsCard } from '../../src/components/home/QuestsCard'
import type { Challenge } from '../../src/api/challenges'

jest.mock('../../src/hooks/useChallenges', () => ({
  useChallenges: jest.fn(),
}))

// Reduce Motion off by default so the component takes its animated path; the
// collapse behaviour under test is the same either way.
jest.mock('../../src/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

const { useChallenges } = jest.requireMock('../../src/hooks/useChallenges')

function challenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'daily-rounds',
    period: 'daily',
    label: 'Play 3 rounds',
    emoji: '🎯',
    target: 3,
    xpReward: 250,
    progress: 1,
    isComplete: false,
    periodStart: '2026-08-01',
    ...overrides,
  }
}

function mockChallenges(challenges: Challenge[], isLoading = false) {
  useChallenges.mockReturnValue({ data: isLoading ? undefined : { challenges }, isLoading })
}

describe('QuestsCard', () => {
  // Expanding mounts quest rows whose progress bars animate on mount. Fake
  // timers let each test flush that animation before unmounting, so a settling
  // bar can't land a state update after the test has finished.
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers() })
    jest.useRealTimers()
  })

  it('summarises progress without listing the quests', () => {
    mockChallenges([
      challenge({ id: 'a', isComplete: true }),
      challenge({ id: 'b', label: 'Answer 20 correctly' }),
    ])
    const { getByText, queryByText } = render(<QuestsCard />)

    expect(getByText('1 of 2')).toBeTruthy()
    expect(queryByText('Answer 20 correctly')).toBeNull()
  })

  it('reveals the quest rows once expanded, and hides them again', () => {
    mockChallenges([challenge({ label: 'Answer 20 correctly' })])
    const { getByRole, getByText, queryByText } = render(<QuestsCard />)
    const toggle = getByRole('button')

    fireEvent.press(toggle)
    expect(getByText('Answer 20 correctly')).toBeTruthy()

    fireEvent.press(toggle)
    expect(queryByText('Answer 20 correctly')).toBeNull()
  })

  it('reports its expanded state to assistive tech', () => {
    mockChallenges([challenge()])
    const { getByRole } = render(<QuestsCard />)
    const toggle = getByRole('button')

    expect(toggle.props.accessibilityState.expanded).toBe(false)
    fireEvent.press(toggle)
    expect(toggle.props.accessibilityState.expanded).toBe(true)
  })

  it('groups daily and weekly quests under their own headings', () => {
    mockChallenges([
      challenge({ id: 'd', period: 'daily' }),
      challenge({ id: 'w', period: 'weekly', label: 'Win 10 rounds' }),
    ])
    const { getByRole, getByText } = render(<QuestsCard />)

    fireEvent.press(getByRole('button'))
    expect(getByText('Today')).toBeTruthy()
    expect(getByText('This Week')).toBeTruthy()
  })

  it('calls out a finished set rather than showing a full count', () => {
    mockChallenges([challenge({ isComplete: true })])
    const { getByText } = render(<QuestsCard />)
    expect(getByText('All done')).toBeTruthy()
  })

  it('renders nothing when there are no quests', () => {
    mockChallenges([])
    const { toJSON } = render(<QuestsCard />)
    expect(toJSON()).toBeNull()
  })

  it('shows a skeleton while loading', () => {
    mockChallenges([], true)
    const { getByLabelText } = render(<QuestsCard />)
    expect(getByLabelText('Loading quests')).toBeTruthy()
  })
})
