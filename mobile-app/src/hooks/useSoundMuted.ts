import { useEffect, useSyncExternalStore } from 'react'
import { isSoundMuted, setSoundMuted, subscribeSoundMuted } from '../lib/sound'
import { storage } from '../utils/storage'

/** Tracks the in-app sound mute preference, live. Any component using this
 * hook re-renders the instant `setSoundMuted` is called anywhere else in the
 * app — needed because menu/interim music are long-running loops that can be
 * muted mid-playback, not just one-shot calls like haptics. */
export function useSoundMuted(): boolean {
  return useSyncExternalStore(subscribeSoundMuted, isSoundMuted, isSoundMuted)
}

/** Primes the mute facade from AsyncStorage once at app root — the sound
 * preference analog of useSyncHapticsWithReducedMotion. */
export function useSyncSoundWithStorage(): void {
  useEffect(() => {
    storage.isSoundEnabled().then((enabled) => setSoundMuted(!enabled)).catch(() => {})
  }, [])
}
