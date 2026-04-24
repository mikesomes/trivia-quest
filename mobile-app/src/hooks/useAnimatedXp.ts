import { useState, useEffect, useRef } from 'react'

const DURATION_MS = 700
const STEPS = 24

export function useAnimatedXp(targetXp: number, onTick?: () => void) {
  const [displayXp, setDisplayXp] = useState(targetXp)
  const prevTarget = useRef(targetXp)

  useEffect(() => {
    if (targetXp === prevTarget.current) return

    const start = prevTarget.current
    const end = targetXp
    prevTarget.current = end

    if (end <= start) {
      setDisplayXp(end)
      return
    }

    const stepMs = DURATION_MS / STEPS
    let step = 0

    const interval = setInterval(() => {
      step++
      const progress = step / STEPS
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * eased)
      setDisplayXp(current)

      if (step % 3 === 0) onTick?.()

      if (step >= STEPS) {
        setDisplayXp(end)
        clearInterval(interval)
      }
    }, stepMs)

    return () => clearInterval(interval)
  }, [targetXp])

  return displayXp
}
