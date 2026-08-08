import { renderHook, act, waitFor } from '@testing-library/react-native'
import { useSoundMuted, useSyncSoundWithStorage } from '../../src/hooks/useSoundMuted'
import { setSoundMuted } from '../../src/lib/sound'

const mockIsSoundEnabled = jest.fn()
const mockSetSoundEnabled = jest.fn().mockResolvedValue(undefined)

jest.mock('../../src/utils/storage', () => ({
  storage: {
    isSoundEnabled: (...args: unknown[]) => mockIsSoundEnabled(...args),
    setSoundEnabled: (...args: unknown[]) => mockSetSoundEnabled(...args),
  },
}))

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}))

describe('useSoundMuted', () => {
  beforeEach(() => {
    // The mute facade is a module-level singleton, so reset it through its own
    // public API between tests rather than reaching into its internals.
    act(() => setSoundMuted(false))
    mockIsSoundEnabled.mockReset().mockResolvedValue(true)
    mockSetSoundEnabled.mockClear()
  })

  it('adopts the persisted value once useSyncSoundWithStorage resolves it', async () => {
    mockIsSoundEnabled.mockResolvedValue(false) // sound disabled -> muted

    const { result } = renderHook(() => {
      useSyncSoundWithStorage()
      return useSoundMuted()
    })

    await waitFor(() => expect(result.current).toBe(true))
  })

  it('notifies every subscribed hook instance when setSoundMuted is called', () => {
    const a = renderHook(() => useSoundMuted())
    const b = renderHook(() => useSoundMuted())
    expect(a.result.current).toBe(false)
    expect(b.result.current).toBe(false)

    act(() => setSoundMuted(true))

    expect(a.result.current).toBe(true)
    expect(b.result.current).toBe(true)
  })

  it('persists the inverse of muted to storage', () => {
    act(() => setSoundMuted(true))
    expect(mockSetSoundEnabled).toHaveBeenCalledWith(false)

    act(() => setSoundMuted(false))
    expect(mockSetSoundEnabled).toHaveBeenCalledWith(true)
  })
})
