import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { ErrorState } from '../../src/components/ui/ErrorState'
import { Skeleton, SkeletonText } from '../../src/components/ui/Skeleton'

describe('EmptyState', () => {
  it('renders the title and body', () => {
    const { getByText } = render(
      <EmptyState icon="medal" title="No achievements yet" body="Finish a round to unlock them." />
    )
    expect(getByText('No achievements yet')).toBeTruthy()
    expect(getByText('Finish a round to unlock them.')).toBeTruthy()
  })

  it('omits the action when none is given', () => {
    const { queryByRole } = render(<EmptyState icon="medal" title="Nothing here" />)
    expect(queryByRole('button')).toBeNull()
  })

  it('invokes the action', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <EmptyState icon="medal" title="Nothing here" action={{ label: 'Play a round', onPress }} />
    )
    fireEvent.press(getByLabelText('Play a round'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorState', () => {
  it('falls back to a generic message', () => {
    const { getByText } = render(<ErrorState />)
    expect(getByText('Something went wrong.')).toBeTruthy()
  })

  it('shows a retry only when a handler is supplied', () => {
    const { queryByText, rerender } = render(<ErrorState message="Nope." />)
    expect(queryByText('Try again')).toBeNull()

    rerender(<ErrorState message="Nope." onRetry={() => {}} />)
    expect(queryByText('Try again')).toBeTruthy()
  })

  it('invokes retry', () => {
    const onRetry = jest.fn()
    const { getByLabelText } = render(<ErrorState message="Nope." onRetry={onRetry} />)
    fireEvent.press(getByLabelText('Try again'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('exposes the message as an alert for screen readers', () => {
    const { getByRole } = render(<ErrorState message="Could not load the leaderboard." />)
    expect(getByRole('alert')).toBeTruthy()
  })
})

describe('Skeleton', () => {
  it('presents the loading region as a single labelled element', () => {
    const { getByLabelText } = render(
      <Skeleton label="Loading your profile">
        <SkeletonText lines={2} />
      </Skeleton>
    )
    expect(getByLabelText('Loading your profile')).toBeTruthy()
  })

  it('defaults its label', () => {
    const { getByLabelText } = render(
      <Skeleton>
        <SkeletonText />
      </Skeleton>
    )
    expect(getByLabelText('Loading')).toBeTruthy()
  })
})
