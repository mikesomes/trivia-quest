export const AUDIO_ASSETS = {
  gameStart: require('../../assets/sounds/game-start.mp3'),
  correct: require('../../assets/sounds/correct.mp3'),
  wrong: require('../../assets/sounds/wrong.mp3'),
  nextRound: require('../../assets/sounds/next-round.mp3'),
  gameOver: require('../../assets/sounds/game-over.mp3'),
  extraLife: require('../../assets/sounds/extra-life.mp3'),
  hammer: require('../../assets/sounds/hammer-hit.wav'),
  xpTick: require('../../assets/sounds/xp-tick.wav'),
  menuMusic: require('../../assets/sounds/menu-music.mp3'),
  interimMusic: require('../../assets/sounds/interim-round.mp3'),
} as const

// Single source of truth for playback volume — previously scattered as magic
// numbers across useSoundEffects, useMenuMusic, results/gameover/sudden-death
// screens, and XpCounter, which is how the game-over clip ended up at two
// different volumes depending on which screen played it.
export const SOUND_VOLUMES = {
  gameStart: 1.0,
  correct: 1.0,
  wrong: 1.0,
  nextRound: 1.0,
  // Canonical value: sudden-death-over.tsx set this deliberately; gameover.tsx
  // only got 1.0 by never setting .volume at all.
  gameOver: 0.5,
  extraLife: 1.0,
  hammer: 0.8,
  shieldBreak: 0.55,
  shimmer: 0.35,
  levelUp: 1.0,
  hammerEarned: 0.35,
  xpTick: 0.3,
  menuMusic: 0.4,
  interimMusic: 0.5,
} as const

export const MUSIC_FADE_MS = 350
