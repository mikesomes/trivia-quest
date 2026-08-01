import * as Haptics from 'expo-haptics'

let enabled = true

/** Single switch for all haptic output — used to honor system Reduce Motion
 * and any future in-app setting. Because every call site goes through this
 * module, flipping it here is the only change needed. */
export function setHapticsEnabled(next: boolean) {
  enabled = next
}

function run(promise: Promise<void>) {
  promise.catch(() => {})
}

/** Intensity vocabulary, so call sites never import expo-haptics themselves. */
export type HapticIntensity = 'light' | 'medium' | 'heavy'

const IMPACT_STYLE: Record<HapticIntensity, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
}

/** Centralized haptic vocabulary, named by feel rather than by feature so the
 * same physical sensation always means the same thing. Swallows errors
 * uniformly (expo-haptics can throw on unsupported platforms/web) so call
 * sites never need their own .catch. */
export const haptics = {
  tapLight: () => enabled && run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  tapMedium: () => enabled && run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  tapHeavy: () => enabled && run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => enabled && run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => enabled && run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => enabled && run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  /** Light, non-committal: filters, chips, tabs, paging, generic buttons. */
  selection: () => haptics.tapLight(),
  /** Medium, committing to a choice: picking a category, mode, or purchase. */
  confirm: () => haptics.tapMedium(),
  /** Medium, a visual element landing: star punch-in, chest shake. */
  punch: () => haptics.tapMedium(),
  /** Earning something: coins, XP milestone, chest payout, purchase complete. */
  reward: () => haptics.success(),
  /** Big celebratory moment: level up, daily challenge cleared. */
  celebrate: () => {
    haptics.success()
    setTimeout(() => haptics.success(), 150)
  },
  /** An action failed: purchase rejected, save error. */
  failure: () => haptics.error(),
  /** Run out / game over — dramatic descending sequence. */
  defeat: () => {
    haptics.error()
    setTimeout(() => haptics.tapHeavy(), 200)
    setTimeout(() => haptics.tapHeavy(), 400)
  },

  /** Correct answer reveal — a satisfying double-success pulse. */
  correctAnswer: () => {
    haptics.success()
    setTimeout(() => haptics.success(), 150)
  },
  /** Wrong answer reveal. */
  wrongAnswer: () => haptics.error(),
  /** Hammer/shield strikes an option off the board. */
  eliminationImpact: () => haptics.tapHeavy(),
  /** Answer option pressed while still selectable. */
  optionPress: () => haptics.tapLight(),
  /** A single timer urgency tick, at the caller's chosen intensity. */
  timerTick: (intensity: HapticIntensity) =>
    enabled && run(Haptics.impactAsync(IMPACT_STYLE[intensity])),
  /** Lub-dub heartbeat pulse for the final countdown seconds. */
  heartbeat: (intensity: HapticIntensity) => {
    haptics.timerTick(intensity)
    setTimeout(() => haptics.timerTick(intensity), 90)
  },
} as const
