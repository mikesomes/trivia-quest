import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

const DEFAULT_DURATION_MS = 700
const DEFAULT_STEPS = 24

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3)
}

interface Options {
  /** Initial value to count up from on mount. Defaults to `target` (no animation on first render). */
  from?: number
  /** Fixed duration, or a function of the value delta (e.g. slower for bigger jumps). */
  durationMs?: number | ((delta: number) => number)
  /** Fixed step count, or a function of the value delta. */
  steps?: number | ((delta: number) => number)
}

/** Eased count-up from the previous value to `target`. Shared by every number
 * ticker in the app (live XP HUD, round-end XP summary) so the easing curve
 * and cadence stay identical everywhere.
 *
 * Honors Reduce Motion by jumping straight to the final value — the player
 * still learns what they earned, just without the ticking. Because every
 * ticker routes through here, no call site needs its own check. */
export function useAnimatedNumber(target: number, options: Options = {}) {
  const [value, setValue] = useState(options.from ?? target)
  const prevTarget = useRef(options.from ?? target)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (target === prevTarget.current) return

    const start = prevTarget.current
    const end = target
    prevTarget.current = end

    if (end <= start || reducedMotion) {
      setValue(end)
      return
    }

    const delta = end - start
    const durationMs = typeof options.durationMs === 'function' ? options.durationMs(delta) : options.durationMs ?? DEFAULT_DURATION_MS
    const steps = typeof options.steps === 'function' ? options.steps(delta) : options.steps ?? DEFAULT_STEPS
    const stepMs = durationMs / steps
    let step = 0

    const interval = setInterval(() => {
      step += 1
      const eased = easeOutCubic(step / steps)
      const next = Math.round(start + delta * eased)

      if (step >= steps) {
        clearInterval(interval)
        setValue(end)
      } else {
        setValue(next)
      }
    }, stepMs)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reducedMotion])

  return value
}
