import { renderHook } from '@testing-library/react-native'
import { useSoundEffects } from '../../src/hooks/useSoundEffects'

// A fresh player object per call, as expo-audio does — the hook must not depend
// on those identities.
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn(), volume: 1 }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}))

describe('useSoundEffects', () => {
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
  })
})
