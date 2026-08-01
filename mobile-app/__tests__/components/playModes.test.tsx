import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PlayModes } from '../../src/components/home/PlayModes'
import { MODE_IDENTITY } from '../../src/components/ui/GameModeArtwork'

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}))

const { router } = jest.requireMock('expo-router')

describe('PlayModes', () => {
  beforeEach(() => jest.clearAllMocks())

  it('offers every mode as its own tile', () => {
    const { getAllByRole } = render(<PlayModes />)
    expect(getAllByRole('button')).toHaveLength(Object.keys(MODE_IDENTITY).length)
  })

  it('sizes the tiles to share the row evenly, so three never leave an orphan', () => {
    const { getAllByRole } = render(<PlayModes />)
    for (const tile of getAllByRole('button')) {
      expect(tile.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ flex: 1 })])
      )
    }
  })

  it('routes each tile to its mode intro', () => {
    const { getByLabelText } = render(<PlayModes />)
    fireEvent.press(getByLabelText('Blitz, 45s sprint'))
    expect(router.push).toHaveBeenCalledWith('/game/mode-intro?mode=blitz')
  })

  it('describes each tile for screen readers', () => {
    const { getByLabelText } = render(<PlayModes />)
    expect(getByLabelText('Classic, Pick a topic')).toBeTruthy()
    expect(getByLabelText('Survival, One life')).toBeTruthy()
  })
})
