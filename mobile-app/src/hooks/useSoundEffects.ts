import { useCallback, useEffect, useRef } from 'react'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { STREAK_TIERS } from '../utils/scoring'

// Streaks at which a shimmer is layered on top of the normal correct sound —
// the same steps where the XP multiplier rises, so the ear and the reward agree.
const SHIMMER_STREAKS = new Set<number>(STREAK_TIERS)

export function useSoundEffects() {
  const gameStart  = useAudioPlayer(require('../../assets/sounds/game-start.mp3'))
  const correct    = useAudioPlayer(require('../../assets/sounds/correct.mp3'))
  const wrong      = useAudioPlayer(require('../../assets/sounds/wrong.mp3'))
  const nextRound  = useAudioPlayer(require('../../assets/sounds/next-round.mp3'))
  const gameOver   = useAudioPlayer(require('../../assets/sounds/game-over.mp3'))
  const extraLife  = useAudioPlayer(require('../../assets/sounds/extra-life.mp3'))
  const hammer     = useAudioPlayer(require('../../assets/sounds/hammer-hit.wav'))
  const shieldBreak = useAudioPlayer(require('../../assets/sounds/hammer-hit.wav'))
  // Separate player so shimmer and extraLife events don't stomp each other
  const shimmer    = useAudioPlayer(require('../../assets/sounds/extra-life.mp3'))

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    shimmer.volume = 0.35
    hammer.volume = 0.8
    shieldBreak.volume = 0.55
  }, [])

  const players = { gameStart, correct, wrong, nextRound, gameOver, extraLife, hammer, shieldBreak }

  // Hold the current players in a ref so `play` can keep a stable identity.
  // It sits in the dependency array of the gameplay screen's submit handler,
  // and a new function every render would give that handler a new identity on
  // every timer tick — re-subscribing the tick interval ten times a second and
  // defeating memoization on the question and its answers.
  const latest = useRef({ players, shimmer })
  latest.current = { players, shimmer }

  const play = useCallback(async (key: keyof typeof players, streak?: number) => {
    const { players: current, shimmer: shimmerPlayer } = latest.current
    const player = current[key]

    if (key === 'correct' && streak !== undefined && SHIMMER_STREAKS.has(streak)) {
      try { await shimmerPlayer.seekTo(0) } catch {}
      try { shimmerPlayer.play() } catch {}
    }

    try { await player.seekTo(0) } catch {}
    try { player.play() } catch {}
  }, [])

  return { play }
}
