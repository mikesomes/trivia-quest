import { useEffect, useState } from 'react'

/**
 * Returns the UTC timestamp (ms) of the next midnight in America/New_York.
 * Uses Intl.DateTimeFormat.formatToParts to derive the Eastern offset at that
 * moment — handles EST (UTC-5) and EDT (UTC-4) automatically.
 */
export function getNextEasternMidnightMs(): number {
  const now = new Date()
  // Today's date string in Eastern time
  const easternToday = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const [y, m, d] = easternToday.split('-').map(Number)

  // UTC midnight of the next Eastern calendar day (used as a reference point)
  const approx = new Date(Date.UTC(y, m - 1, d + 1))

  // Derive the ET offset at that UTC instant via formatToParts.
  // offset = UTC_timestamp − (ET parts interpreted as UTC)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  }).formatToParts(approx)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10)
  let h = get('hour')
  if (h === 24) h = 0
  const tzAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second'))
  const offsetMs = approx.getTime() - tzAsUTC

  // UTC time of ET midnight on the next Eastern day:
  // when ET clock shows 00:00:00 → UTC = Date.UTC(next Eastern day) + offsetMs
  return Date.UTC(y, m - 1, d + 1) + offsetMs
}

/** Live-ticking "HH:MM:SS" countdown to the next Eastern midnight. */
export function useEasternMidnightCountdown(): string {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function tick() {
      const diff = getNextEasternMidnightMs() - Date.now()
      if (diff <= 0) { setTimeLeft('00:00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return timeLeft
}
