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
  textMuted: '#4a5568',

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

export const fonts = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  semiBold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  extraBold: 'NunitoSans_800ExtraBold',
  black: 'NunitoSans_900Black',
} as const
