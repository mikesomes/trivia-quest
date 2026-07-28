import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { setHapticsEnabled } from '../lib/haptics'

/**
 * Tracks the system "Reduce Motion" setting.
 *
 * Celebration-heavy surfaces (level up, chest open, confetti, count-ups)
 * should snap to their end state rather than animate when this is true —
 * never skip the outcome itself, only the movement getting there.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    let active = true

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (active) setReduced(enabled) })
      .catch(() => {})

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)

    return () => {
      active = false
      sub.remove()
    }
  }, [])

  return reduced
}

/**
 * Mirrors Reduce Motion into the haptics facade once, at app root. Players who
 * suppress motion are generally also suppressing the physical equivalent, and
 * routing it through the facade means no call site needs its own check.
 */
export function useSyncHapticsWithReducedMotion(): void {
  const reduced = useReducedMotion()
  useEffect(() => { setHapticsEnabled(!reduced) }, [reduced])
}
