import { useCallback, useEffect, useRef } from 'react'
import { useAudioPlayer } from 'expo-audio'
import { AUDIO_ASSETS, SOUND_VOLUMES } from '../constants/audio'
import { isSoundMuted } from '../lib/sound'
import { STREAK_TIERS } from '../utils/scoring'

// Streaks at which a shimmer is layered on top of the normal correct sound —
// the same steps where the XP multiplier rises, so the ear and the reward agree.
const SHIMMER_STREAKS = new Set<number>(STREAK_TIERS)

export function useSoundEffects() {
  const gameStart  = useAudioPlayer(AUDIO_ASSETS.gameStart)
  const correct    = useAudioPlayer(AUDIO_ASSETS.correct)
  const wrong      = useAudioPlayer(AUDIO_ASSETS.wrong)
  const nextRound  = useAudioPlayer(AUDIO_ASSETS.nextRound)
  const gameOver   = useAudioPlayer(AUDIO_ASSETS.gameOver)
  const extraLife  = useAudioPlayer(AUDIO_ASSETS.extraLife)
  const hammer     = useAudioPlayer(AUDIO_ASSETS.hammer)
  const shieldBreak = useAudioPlayer(AUDIO_ASSETS.hammer)
  // Separate players so events that can land on the same answer (a streak
  // shimmer alongside a hammer earned, say) don't stomp each other's playback.
  const shimmer      = useAudioPlayer(AUDIO_ASSETS.extraLife)
  const levelUp       = useAudioPlayer(AUDIO_ASSETS.extraLife)
  const hammerEarned  = useAudioPlayer(AUDIO_ASSETS.extraLife)

  useEffect(() => {
    gameOver.volume = SOUND_VOLUMES.gameOver
    shimmer.volume = SOUND_VOLUMES.shimmer
    hammer.volume = SOUND_VOLUMES.hammer
    shieldBreak.volume = SOUND_VOLUMES.shieldBreak
    levelUp.volume = SOUND_VOLUMES.levelUp
    hammerEarned.volume = SOUND_VOLUMES.hammerEarned
  }, [])

  const players = { gameStart, correct, wrong, nextRound, gameOver, extraLife, hammer, shieldBreak, levelUp, hammerEarned }

  // Hold the current players in a ref so `play` can keep a stable identity.
  // It sits in the dependency array of the gameplay screen's submit handler,
  // and a new function every render would give that handler a new identity on
  // every timer tick — re-subscribing the tick interval ten times a second and
  // defeating memoization on the question and its answers.
  const latest = useRef({ players, shimmer })
  latest.current = { players, shimmer }

  const play = useCallback(async (key: keyof typeof players, streak?: number) => {
    if (isSoundMuted()) return

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
