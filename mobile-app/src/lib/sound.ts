import { setAudioModeAsync } from 'expo-audio'
import { storage } from '../utils/storage'

type Listener = () => void

let muted = false
const listeners = new Set<Listener>()

export function isSoundMuted(): boolean {
  return muted
}

/** Flips the mute state and persists it. Notifies every subscribed hook so
 * long-running music loops react immediately, not just future one-shot SFX. */
export function setSoundMuted(next: boolean): void {
  if (muted === next) return
  muted = next
  listeners.forEach((l) => l())
  storage.setSoundEnabled(!next).catch(() => {})
}

export function subscribeSoundMuted(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Call once at app boot. Consolidates the audio-session setup that used to be
 * repeated in every file with a player (useSoundEffects, useMenuMusic,
 * results/gameover/sudden-death-over), and adds the background-playback
 * config the lock screen needs. */
export function initAudioSession(): void {
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'mixWithOthers',
  }).catch(() => {})
}
