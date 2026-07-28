import { AccessibilityInfo } from 'react-native'

/**
 * Speaks a message through the active screen reader.
 *
 * Use for outcomes a sighted player learns from color or motion alone — the
 * answer reveal, the timer running out, a level up. Without these the game is
 * unplayable with VoiceOver, because correct/wrong is signalled by a green or
 * red fill and a shake.
 *
 * No-ops silently when no screen reader is running.
 */
export function announce(message: string) {
  if (!message) return
  AccessibilityInfo.announceForAccessibility(message)
}

/** Whether a screen reader is currently active. */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled()
  } catch {
    return false
  }
}

// ── Phrase builders ──────────────────────────────────────────────────────────
// Kept here so wording stays consistent everywhere it is spoken, and so the
// phrasing is unit-testable without mounting a screen.

export function answerRevealMessage(opts: {
  isCorrect: boolean
  correctAnswerText?: string
  xpEarned?: number
}): string {
  const parts: string[] = [opts.isCorrect ? 'Correct.' : 'Incorrect.']
  if (!opts.isCorrect && opts.correctAnswerText) {
    parts.push(`The answer was ${opts.correctAnswerText}.`)
  }
  if (opts.xpEarned && opts.xpEarned > 0) {
    parts.push(`${opts.xpEarned} XP earned.`)
  }
  return parts.join(' ')
}

export function livesMessage(remaining: number): string {
  return remaining === 1 ? '1 life remaining' : `${remaining} lives remaining`
}

export function streakMessage(streak: number): string {
  return `${streak} answer streak`
}

export function timerMessage(secondsLeft: number): string {
  return secondsLeft === 1 ? '1 second left' : `${secondsLeft} seconds left`
}
