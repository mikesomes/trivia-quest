export const colors = {
  // Background
  bg: '#0f0f1a',
  bgCard: '#1a1a2e',
  bgCardAlt: '#16213e',

  // Primary / accent
  primary: '#6c63ff',
  primaryLight: '#8b83ff',
  primaryDark: '#4a42cc',

  // Answer states
  correct: '#4CAF50',
  correctBg: 'rgba(76, 175, 80, 0.15)',
  incorrect: '#F44336',
  incorrectBg: 'rgba(244, 67, 54, 0.15)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a0aec0',
  textMuted: '#7d8ba1',
  /** Text/icons sitting on a filled accent surface (primary buttons, pills). */
  textOnAccent: '#ffffff',
  /** Unavailable or locked copy — dim, but still legible on surface0. */
  textDisabled: '#888888',

  // Currency + placement
  /** Coins and first place. */
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Difficulty colors
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',

  // Timer
  timerNormal: '#6c63ff',
  timerWarning: '#FF9800',
  timerDanger: '#F44336',

  // Lives
  lifeActive: '#F44336',
  lifeEmpty: '#2d2d44',

  // Streak
  streakActive: '#FFD700',

  // Border
  border: '#2d2d44',

  // Tab bar
  tabActive: '#6c63ff',
  tabInactive: '#4a5568',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

/**
 * Icon sizing scale. Marks drawn at these sizes stay optically consistent with
 * each other and with the text they sit beside — prefer them over ad-hoc px.
 */
export const iconSize = {
  /** Inline with small text: chips, dense list rows, inline badges. */
  sm: 16,
  /** Default. Buttons, list rows, stat labels. */
  md: 22,
  /** Section headers and prominent status marks. */
  lg: 30,
  /** Hero moments: empty states, modal glyphs. */
  xl: 40,
  /** Game-mode selection cards. */
  gameMode: 48,
} as const

export const fonts = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  semiBold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  extraBold: 'NunitoSans_800ExtraBold',
  black: 'NunitoSans_900Black',
} as const

/**
 * Elevation surfaces, darkest (screen background) to lightest (floating UI).
 * Prefer these over ad-hoc hex values so depth reads consistently.
 */
export const surfaces = {
  surface0: '#0f0f1a', // screen background (== colors.bg)
  surface1: '#16162a', // inset panels
  surface2: '#1a1a2e', // cards (== colors.bgCard)
  surface3: '#222240', // raised elements: modals, toasts, popovers
} as const

/** The app-wide background wash. Use instead of re-declaring the stops. */
export const screenGradient = ['#0f0f1a', '#16103a'] as const

/** Shared animation timings/springs so all motion has the same physics. */
export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 450,
  },
  /** For Animated.spring — snappy UI response (presses, toggles). */
  springSnappy: { friction: 8, tension: 120 },
  /** For Animated.spring — celebratory overshoot (reveals, rewards). */
  springBouncy: { friction: 5, tension: 80 },
  /** For Reanimated withSpring — snappy UI response (presses, toggles). */
  reanimatedSpringSnappy: { damping: 16, stiffness: 260, mass: 0.5 },
  /** For Reanimated withSpring — celebratory overshoot (reveals, rewards). */
  reanimatedSpringBouncy: { damping: 10, stiffness: 160, mass: 0.6 },
} as const

/** Soft glow shadow keyed by accent color; spread via style arrays. */
export function glow(color: string, opacity = 0.35, radiusPx = 12) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radiusPx,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  } as const
}
