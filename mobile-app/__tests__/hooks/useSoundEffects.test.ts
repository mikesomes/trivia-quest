import { renderHook } from '@testing-library/react-native'
import { useSoundEffects } from '../../src/hooks/useSoundEffects'
import { isSoundMuted } from '../../src/lib/sound'

// Shared spies so mute assertions can check them, even though each
// useAudioPlayer() call still returns its own fresh object — the hook must
// not depend on those object identities.
const mockPlay = jest.fn()
const mockSeekTo = jest.fn().mockResolvedValue(undefined)

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ seekTo: mockSeekTo, play: mockPlay, volume: 1 }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/lib/sound', () => ({
  isSoundMuted: jest.fn(() => false),
}))

describe('useSoundEffects', () => {
  beforeEach(() => {
    mockPlay.mockClear()
    mockSeekTo.mockClear()
    ;(isSoundMuted as jest.Mock).mockReturnValue(false)
  })

  // `play` sits in the dependency array of the gameplay screen's submit handler.
  // If it changed identity per render, that handler would too — and since the
  // timer effect depends on it, the tick interval would be torn down and
  // recreated ten times a second, dragging the countdown and breaking the memo
  // on the question card and all four answers.
  it('keeps play referentially stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useSoundEffects())
    const first = result.current.play

    rerender({})
    rerender({})

    expect(result.current.play).toBe(first)
  })

  it('still plays through the current player after a re-render', async () => {
    const { result, rerender } = renderHook(() => useSoundEffects())
    rerender({})

    await expect(result.current.play('correct', 4)).resolves.toBeUndefined()
    expect(mockPlay).toHaveBeenCalled()
  })

  it('does not play when sound is muted', async () => {
    ;(isSoundMuted as jest.Mock).mockReturnValue(true)
    const { result } = renderHook(() => useSoundEffects())

    await result.current.play('correct', 4)

    expect(mockSeekTo).not.toHaveBeenCalled()
    expect(mockPlay).not.toHaveBeenCalled()
  })
})
