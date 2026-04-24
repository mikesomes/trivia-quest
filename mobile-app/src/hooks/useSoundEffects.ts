import { useEffect } from 'react'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'

// Streaks at which a shimmer is layered on top of the normal correct sound.
const SHIMMER_STREAKS = new Set([3, 6, 10])

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

  async function play(key: keyof typeof players, streak?: number) {
    const player = players[key]

    if (key === 'correct' && streak !== undefined && SHIMMER_STREAKS.has(streak)) {
      try { await shimmer.seekTo(0) } catch {}
      try { shimmer.play() } catch {}
    }

    try { await player.seekTo(0) } catch {}
    try { player.play() } catch {}
  }

  return { play }
}
