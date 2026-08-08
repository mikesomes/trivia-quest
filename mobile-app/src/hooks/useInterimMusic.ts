import { useEffect, useRef } from 'react'
import { useAudioPlayer } from 'expo-audio'
import { AUDIO_ASSETS, SOUND_VOLUMES, MUSIC_FADE_MS } from '../constants/audio'
import { useSoundMuted } from './useSoundMuted'
import { createVolumeFader } from '../lib/audioFade'

/** Background loop for the results / "between rounds" screen. Mirrors
 * useMenuMusic's fade/mute behavior but owns its own mount/unmount lifecycle
 * rather than reacting to route changes. */
export function useInterimMusic() {
  const player = useAudioPlayer(AUDIO_ASSETS.interimMusic)
  const muted = useSoundMuted()

  const playerRef = useRef(player)
  playerRef.current = player
  const faderRef = useRef(createVolumeFader(() => playerRef.current))

  useEffect(() => {
    player.volume = 0
    player.loop = true
    return () => {
      // Not an animated fade-out: the underlying native player is released
      // right after this cleanup runs, so an in-flight volume ramp would end
      // up writing to an already-disposed player after its first tick.
      faderRef.current.cancel()
      try { playerRef.current.pause() } catch {}
    }
  }, [])

  useEffect(() => {
    const fader = faderRef.current
    try {
      if (muted) {
        fader.fadeTo(0, MUSIC_FADE_MS, () => {
          try { playerRef.current.pause() } catch {}
        })
      } else {
        const wasStopped = !player.playing
        if (wasStopped) player.volume = 0
        player.play()
        fader.fadeTo(SOUND_VOLUMES.interimMusic, MUSIC_FADE_MS)
      }
    } catch {}
  }, [muted])
}
