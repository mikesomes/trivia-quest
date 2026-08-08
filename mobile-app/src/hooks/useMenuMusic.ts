import { useEffect, useRef } from 'react'
import { useAudioPlayer } from 'expo-audio'
import { usePathname } from 'expo-router'
import { AUDIO_ASSETS, SOUND_VOLUMES, MUSIC_FADE_MS } from '../constants/audio'
import { useSoundMuted } from './useSoundMuted'
import { createVolumeFader } from '../lib/audioFade'

const SILENT_ROUTES = ['/game/play', '/game/results', '/game/gameover', '/game/sudden-death-over']

export function useMenuMusic() {
  const player = useAudioPlayer(AUDIO_ASSETS.menuMusic)
  const pathname = usePathname()
  const muted = useSoundMuted()

  // Player identities aren't assumed stable across renders (expo-audio can
  // hand back a fresh wrapper per call), so the fader always reads through a
  // ref rather than closing over a possibly-stale `player`.
  const playerRef = useRef(player)
  playerRef.current = player
  const faderRef = useRef(createVolumeFader(() => playerRef.current))

  useEffect(() => {
    player.volume = 0
    player.loop = true
    try {
      player.setActiveForLockScreen(true, {
        title: 'Trivia Quest',
        artworkUrl: 'https://lwcmdploapospflkmaws.supabase.co/storage/v1/object/public/public/splash.PNG',
      })
    } catch {}
  }, [])

  useEffect(() => {
    const fader = faderRef.current
    try {
      if (muted || SILENT_ROUTES.includes(pathname)) {
        fader.fadeTo(0, MUSIC_FADE_MS, () => {
          try { playerRef.current.pause() } catch {}
        })
      } else {
        const wasStopped = !player.playing
        if (wasStopped) player.volume = 0
        player.play()
        fader.fadeTo(SOUND_VOLUMES.menuMusic, MUSIC_FADE_MS)
      }
    } catch {}
  }, [pathname, muted])
}
