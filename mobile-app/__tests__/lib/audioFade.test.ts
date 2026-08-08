import { createVolumeFader } from '../../src/lib/audioFade'

describe('createVolumeFader', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('steps volume from start to target and lands exactly on target', () => {
    const player = { volume: 0 }
    const fader = createVolumeFader(() => player, 30)

    fader.fadeTo(1, 300)
    jest.advanceTimersByTime(300)

    expect(player.volume).toBe(1)
  })

  it('calls onDone exactly once when the fade completes', () => {
    const player = { volume: 0 }
    const fader = createVolumeFader(() => player, 30)
    const onDone = jest.fn()

    fader.fadeTo(1, 300, onDone)
    jest.advanceTimersByTime(300)

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('cancel() stops an in-flight fade with no further volume writes', () => {
    const player = { volume: 0 }
    const fader = createVolumeFader(() => player, 30)

    fader.fadeTo(1, 300)
    jest.advanceTimersByTime(150)
    const midVolume = player.volume
    expect(midVolume).toBeGreaterThan(0)
    expect(midVolume).toBeLessThan(1)

    fader.cancel()
    jest.advanceTimersByTime(300)

    expect(player.volume).toBe(midVolume)
  })

  it('a second fadeTo() call replaces the prior interval instead of stacking', () => {
    const player = { volume: 0 }
    const fader = createVolumeFader(() => player, 30)

    fader.fadeTo(1, 300)
    jest.advanceTimersByTime(150)
    fader.fadeTo(0, 300)
    jest.advanceTimersByTime(300)

    expect(player.volume).toBe(0)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('does nothing when the player is unavailable', () => {
    const fader = createVolumeFader(() => null, 30)
    expect(() => fader.fadeTo(1, 300)).not.toThrow()
    expect(jest.getTimerCount()).toBe(0)
  })
})
