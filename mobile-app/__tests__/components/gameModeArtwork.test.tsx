import React from 'react'
import { StyleSheet, View } from 'react-native'
import { render } from '@testing-library/react-native'
import {
  GameModeArtwork,
  imageArtwork,
  svgArtwork,
  type GameModeId,
  type ModeArtworkSvgProps,
} from '../../src/components/ui/GameModeArtwork'

const MODES: GameModeId[] = ['classic', 'blitz', 'survival']

describe('GameModeArtwork', () => {
  it('renders every mode', () => {
    for (const mode of MODES) {
      expect(() => render(<GameModeArtwork mode={mode} />)).not.toThrow()
    }
  })

  it('exposes a label when one is given', () => {
    const { getByLabelText } = render(<GameModeArtwork mode="blitz" label="Blitz mode" />)
    expect(getByLabelText('Blitz mode')).toBeTruthy()
  })

  it('hides the plate from screen readers when the card already names the mode', () => {
    const { queryByTestId } = render(<GameModeArtwork mode="classic" testID="plate" />)

    // Unreachable by default is the assertion: it is drawn, but decorative.
    expect(queryByTestId('plate')).toBeNull()
    expect(queryByTestId('plate', { includeHiddenElements: true })).not.toBeNull()
  })

  it('keeps the plate square at whatever size it is given', () => {
    const { getByTestId } = render(
      <GameModeArtwork mode="survival" size={120} label="Survival" testID="plate" />
    )
    const style = StyleSheet.flatten(getByTestId('plate').props.style)
    expect(style.width).toBe(120)
    expect(style.height).toBe(120)
  })
})

describe('artwork sources', () => {
  it('tags svg artwork so it is never confused with an image source', () => {
    const Emblem = ({ size }: ModeArtworkSvgProps) => <View style={{ width: size, height: size }} />
    const art = svgArtwork(Emblem)

    expect(art.kind).toBe('svg')
    // `require()` returns an opaque number and memo returns an object, so the
    // tag — not the shape — is what the renderer branches on.
    expect(imageArtwork(1 as never).kind).toBe('image')
  })
})
