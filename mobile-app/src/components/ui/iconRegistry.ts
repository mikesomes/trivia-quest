import type React from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Balloon,
  Bank,
  Brain,
  CalendarBlank,
  CalendarStar,
  CaretDown,
  CaretUp,
  CheckCircle,
  Coffee,
  Coins,
  Compass,
  Confetti,
  Crown,
  Detective,
  Diamond,
  Eye,
  FilmSlate,
  FilmStrip,
  Fire,
  Flag,
  Flask,
  Football,
  GameController,
  Gear,
  Gift,
  GlobeHemisphereWest,
  GraduationCap,
  Hammer,
  Heart,
  Horse,
  House,
  InfinityIcon,
  Leaf,
  Lightbulb,
  Lightning,
  ListChecks,
  LockSimple,
  LockSimpleOpen,
  MagicWand,
  MapTrifold,
  Medal,
  Minus,
  Moon,
  Mountains,
  MusicNotes,
  Note,
  Package,
  Palette,
  PencilSimple,
  Plant,
  Prohibit,
  PuzzlePiece,
  Quotes,
  Scroll,
  SealCheck,
  Shield,
  ShoppingCart,
  Shuffle,
  Skull,
  Snowflake,
  SoccerBall,
  Sparkle,
  Star,
  Strategy,
  Sword,
  Target,
  Timer,
  TrendUp,
  Trophy,
  UserCircle,
  Vault,
  Warning,
  X,
  XCircle,
  Pause,
  type IconProps,
  type IconWeight,
} from 'phosphor-react-native'
import { colors } from '../../constants/theme'

/**
 * The app's icon vocabulary.
 *
 * Screens and data files refer to icons by *semantic* name ("victory", "streak")
 * rather than by Phosphor component name, so the underlying mark can change
 * without touching call sites. Every mark in the app resolves through this
 * table — it is the single source of truth for which glyph, weight, and default
 * tint a concept carries.
 *
 * These replace the emoji that used to do this job: emoji render differently on
 * every OS version, can't be tinted to match the theme, and don't share optical
 * weight with anything else on screen.
 *
 * Marks are imported statically (never `require`d by name) so Metro and web
 * bundlers can tree-shake and so nothing breaks under static analysis.
 */
export interface IconSpec {
  mark: React.ComponentType<IconProps>
  /**
   * Weight this mark carries unless a call site overrides it. Duotone is the
   * house style; navigation and very small marks use bold so they stay legible
   * at 16px, where duotone's fill muddies the shape.
   */
  weight: IconWeight
  /** Default tint. Call sites override for state (disabled, on-accent, etc). */
  color: string
}

function spec(
  mark: React.ComponentType<IconProps>,
  color: string,
  weight: IconWeight = 'duotone'
): IconSpec {
  return { mark, color, weight }
}

// Marks that carry the same meaning under two names are declared once and
// aliased, so an alias can never visually drift from its canonical key.
const LOCKED = spec(LockSimple, colors.textDisabled)
const COMPLETED = spec(CheckCircle, colors.correct)
const RANK = spec(Crown, colors.gold)
const VICTORY = spec(Trophy, colors.gold)
const ACHIEVEMENT = spec(Medal, colors.gold)
const STREAK = spec(Fire, colors.streakActive)
const QUICK_PLAY = spec(Lightning, colors.primary)
const TRIVIA = spec(Brain, colors.primary)

export const ICONS = {
  // ── Navigation & chrome ────────────────────────────────────────────────
  // Bold, not duotone: these sit at small sizes where a two-tone fill reads
  // as blur rather than depth.
  home: spec(House, colors.textPrimary, 'bold'),
  back: spec(ArrowLeft, colors.textPrimary, 'bold'),
  next: spec(ArrowRight, colors.textOnAccent, 'bold'),
  close: spec(X, colors.textSecondary, 'bold'),
  pause: spec(Pause, colors.textPrimary, 'fill'),
  settings: spec(Gear, colors.textSecondary),
  profile: spec(UserCircle, colors.primary),
  shop: spec(ShoppingCart, colors.primary),
  leaderboard: RANK,

  // ── Quest & game modes ─────────────────────────────────────────────────
  quest: spec(Compass, colors.primary),
  map: spec(MapTrifold, colors.primary),
  challenge: spec(Sword, colors.primaryLight),
  quickPlay: QUICK_PLAY,
  dailyChallenge: spec(CalendarStar, colors.primary),
  trivia: TRIVIA,

  // ── Categories ─────────────────────────────────────────────────────────
  // Resolved from a category id by CategoryBadge; kept here so category marks
  // live in the same vocabulary as everything else.
  history: spec(Scroll, colors.textSecondary),
  science: spec(Flask, colors.textSecondary),
  geography: spec(GlobeHemisphereWest, colors.textSecondary),
  movies: spec(FilmSlate, colors.textSecondary),
  movieQuotes: spec(FilmStrip, colors.textSecondary),
  music: spec(MusicNotes, colors.textSecondary),
  sports: spec(SoccerBall, colors.textSecondary),
  football: spec(Football, colors.textSecondary),
  rome: spec(Bank, colors.textSecondary),
  wizardry: spec(MagicWand, colors.textSecondary),
  quotes: spec(Quotes, colors.textSecondary),
  art: spec(Palette, colors.textSecondary),
  popCulture: spec(Star, colors.textSecondary),

  // ── Status & progression ───────────────────────────────────────────────
  victory: VICTORY,
  rank: RANK,
  achievement: ACHIEVEMENT,
  streak: STREAK,
  locked: LOCKED,
  completed: COMPLETED,
  rankUp: spec(CaretUp, colors.correct, 'bold'),
  rankDown: spec(CaretDown, colors.incorrect, 'bold'),
  rankSame: spec(Minus, colors.textMuted, 'bold'),

  // ── Currency, power-ups, rewards ───────────────────────────────────────
  coin: spec(Coins, colors.gold),
  jackpot: spec(Diamond, colors.primaryLight),
  xp: QUICK_PLAY,
  life: spec(Heart, colors.lifeActive),
  star: spec(Star, colors.gold),
  hammer: spec(Hammer, colors.primaryLight),
  shield: spec(Shield, colors.primaryLight),
  gift: spec(Gift, colors.primaryLight),
  chest: spec(Package, colors.bronze),
  freeze: spec(Snowflake, '#7FD4FF'),

  // ── Answer & round state ───────────────────────────────────────────────
  correct: COMPLETED,
  wrong: spec(XCircle, colors.incorrect),
  skull: spec(Skull, colors.incorrect),
  timer: spec(Timer, colors.timerWarning),
  warning: spec(Warning, colors.timerWarning),
  celebrate: spec(Confetti, colors.gold),
  sparkle: spec(Sparkle, colors.gold),
  target: spec(Target, colors.primary),
  calendar: spec(CalendarBlank, colors.textSecondary),
  flag: spec(Flag, colors.textSecondary),
  edit: spec(PencilSimple, colors.textSecondary),
  unlock: spec(LockSimpleOpen, colors.correct),
  games: spec(GameController, colors.primary),
  note: spec(Note, colors.textSecondary),

  // ── Rule bullets & mode marks ──────────────────────────────────────────
  list: spec(ListChecks, colors.textSecondary),
  shuffle: spec(Shuffle, colors.textSecondary),
  prohibit: spec(Prohibit, colors.textSecondary),
  endless: spec(InfinityIcon, colors.textSecondary),
  trendUp: spec(TrendUp, colors.correct),
  puzzle: spec(PuzzlePiece, '#10B981'),
  eye: spec(Eye, colors.textSecondary),
  idea: spec(Lightbulb, colors.gold),

  // ── Avatar progression stages ──────────────────────────────────────────
  seedling: spec(Plant, colors.correct),
  leaf: spec(Leaf, '#66BB6A'),
  scholar: spec(GraduationCap, colors.gold),
  strategist: spec(Strategy, '#FF5722'),
  moon: spec(Moon, '#7B8CFF'),
  cosmos: spec(Balloon, '#8B9CFF'),

  // ── Achievement marks ──────────────────────────────────────────────────
  endurance: spec(Mountains, colors.textSecondary),
  perfect: spec(SealCheck, colors.correct),
  vault: spec(Vault, colors.bronze),

  // ── Easter egg flavor ──────────────────────────────────────────────────
  coffee: spec(Coffee, colors.bronze),
  detective: spec(Detective, colors.primaryLight),
  mythical: spec(Horse, colors.primaryLight),

  // ── Back-compat aliases ────────────────────────────────────────────────
  // Older call sites use these names; they resolve to the same specs above so
  // the two can never drift apart visually.
  brain: TRIVIA,
  flame: STREAK,
  trophy: VICTORY,
  crown: RANK,
  medal: ACHIEVEMENT,
  lock: LOCKED,
} as const satisfies Record<string, IconSpec>

/** Every icon the app can draw. */
export type IconName = keyof typeof ICONS

export function getIconSpec(name: IconName): IconSpec {
  return ICONS[name]
}

// ── Data-keyed lookups ───────────────────────────────────────────────────────
// Categories and achievements arrive from the server as ids (and, historically,
// as emoji). These tables turn an id into a mark. Both fall back rather than
// throw, so rows added server-side render something sensible without a client
// release.

export const CATEGORY_ICON_NAMES: Record<string, IconName> = {
  general_knowledge: 'trivia',
  history: 'history',
  science: 'science',
  sports: 'sports',
  movies_tv: 'movies',
  geography: 'geography',
  nfl_football: 'football',
  roman_history: 'rome',
  harry_potter: 'wizardry',
  famous_quotes: 'quotes',
  music: 'music',
  odd_one_out: 'puzzle',
  art_history: 'art',
  movie_quotes: 'movieQuotes',
  pop_culture: 'popCulture',
}

export function categoryIconName(categoryId: string): IconName {
  return CATEGORY_ICON_NAMES[categoryId] ?? 'trivia'
}

const CATEGORY_MASTER_PREFIX = 'category_master_'

/**
 * Achievement catalogue rows carry an `icon` emoji column. We draw a themed
 * mark keyed off the achievement id instead, so badges match the rest of the
 * app's iconography.
 */
export const ACHIEVEMENT_ICON_NAMES: Record<string, IconName> = {
  first_game: 'games',
  games_10: 'games',
  games_50: 'games',
  games_100: 'victory',
  high_scorer: 'star',
  big_brain: 'trivia',
  perfect_round: 'perfect',
  survivor: 'life',
  speed_demon: 'quickPlay',
  streak_5: 'streak',
  streak_10: 'streak',
  streak_15: 'rank',
  survival_10: 'shield',
  survival_25: 'endurance',
  survival_50: 'endurance',
  blitz_15: 'quickPlay',
  blitz_25: 'quickPlay',
  blitz_35: 'quickPlay',
  day_streak_7: 'streak',
  day_streak_30: 'calendar',
  day_streak_100: 'streak',
  chest_streak_7: 'chest',
  chest_streak_30: 'vault',
}

export function achievementIconName(id: string): IconName {
  if (id.startsWith(CATEGORY_MASTER_PREFIX)) {
    return categoryIconName(id.slice(CATEGORY_MASTER_PREFIX.length))
  }
  return ACHIEVEMENT_ICON_NAMES[id] ?? 'achievement'
}
