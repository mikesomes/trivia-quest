import { useEffect, useState } from 'react'

function secondsRemaining(totalSeconds: number, startedAt: number): number {
  return Math.max(0, totalSeconds - Math.floor((Date.now() - startedAt) / 1000))
}

/** Ticks down from `totalSeconds` to 0, measured from `startedAt` (defaults to mount time). */
export function useCountdownSeconds(totalSeconds: number, startedAt: number = Date.now()): number {
  const [remaining, setRemaining] = useState(() => secondsRemaining(totalSeconds, startedAt))

  useEffect(() => {
    const tick = () => setRemaining(secondsRemaining(totalSeconds, startedAt))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [totalSeconds, startedAt])

  return remaining
}
