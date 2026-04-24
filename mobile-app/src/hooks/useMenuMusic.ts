import { useEffect } from 'react'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { usePathname } from 'expo-router'

const SILENT_ROUTES = ['/game/play', '/game/results', '/game/gameover', '/game/sudden-death-over']

export function useMenuMusic() {
  const player = useAudioPlayer(require('../../assets/sounds/menu-music.mp3'))
  const pathname = usePathname()

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    player.volume = 0.4
    try {
      player.updateLockScreenMetadata({
        title: 'Trivia Quest',
        artworkUrl: 'https://lwcmdploapospflkmaws.supabase.co/storage/v1/object/public/public/splash.PNG',
      })
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (SILENT_ROUTES.includes(pathname)) {
        player.pause()
      } else {
        player.loop = true
        player.play()
      }
    } catch {}
  }, [pathname])
}
