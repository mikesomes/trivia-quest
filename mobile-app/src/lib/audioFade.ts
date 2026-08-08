interface FadeablePlayer {
  volume: number
}

/**
 * Manual volume ramp for loop-to-loop music transitions — expo-audio has no
 * native fade API. Uses setInterval rather than requestAnimationFrame: RN's
 * rAF polyfill throttles under JS-thread load, exactly when a fade is likely
 * to run (a screen transition).
 *
 * `getPlayer` is a lazy accessor rather than a fixed reference so a fade
 * started against a player that gets torn out from under it (unmount) can
 * detect that and stop, instead of writing to a stale object.
 */
export function createVolumeFader(getPlayer: () => FadeablePlayer | null, stepMs = 30) {
  let timer: ReturnType<typeof setInterval> | null = null

  function cancel() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function fadeTo(target: number, durationMs: number, onDone?: () => void) {
    cancel()
    const player = getPlayer()
    if (!player) return

    const start = player.volume
    const steps = Math.max(1, Math.round(durationMs / stepMs))
    let i = 0

    timer = setInterval(() => {
      i++
      const p = getPlayer()
      if (!p) { cancel(); return }
      p.volume = start + (target - start) * (i / steps)
      if (i >= steps) {
        p.volume = target
        cancel()
        onDone?.()
      }
    }, stepMs)
  }

  return { fadeTo, cancel }
}
