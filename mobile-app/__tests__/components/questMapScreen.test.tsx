import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { QuestMapScreen } from '../../src/components/quest/QuestMapScreen'
import { useQuestMap } from '../../src/hooks/useQuestMap'

jest.mock('../../src/hooks/useQuestMap', () => ({
  useQuestMap: jest.fn(),
}))
jest.mock('../../src/api/quest', () => ({
  questApi: { startNode: jest.fn() },
}))
jest.mock('../../src/api/rounds', () => ({
  roundsApi: { create: jest.fn(), getQuestions: jest.fn() },
}))
jest.mock('../../src/hooks/useProfile', () => ({
  useProfile: () => ({ data: { level: 1 } }),
}))
jest.mock('../../src/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}))

const mockUseQuestMap = useQuestMap as jest.MockedFunction<typeof useQuestMap>

describe('QuestMapScreen states', () => {
  it('renders an expedition-specific loading state', () => {
    mockUseQuestMap.mockReturnValue({
      isLoading: true,
      data: undefined,
    } as ReturnType<typeof useQuestMap>)

    const { getByText } = render(<QuestMapScreen />)
    expect(getByText('Charting the Knowledge Isles…')).toBeTruthy()
  })

  it('renders a retryable error state', () => {
    const refetch = jest.fn()
    mockUseQuestMap.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      refetch,
    } as unknown as ReturnType<typeof useQuestMap>)

    const { getByText, getByLabelText } = render(<QuestMapScreen />)
    expect(getByText('The Knowledge Isles could not be charted.')).toBeTruthy()
    fireEvent.press(getByLabelText('Try again'))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
