import React from 'react'
import {
  ArrowRight,
  Balloon,
  Brain,
  CalendarBlank,
  CheckCircle,
  Coins,
  Confetti,
  Crown,
  Diamond,
  Eye,
  Fire,
  Flag,
  Gift,
  GameController,
  GraduationCap,
  Hammer,
  Heart,
  InfinityIcon,
  Leaf,
  Lightbulb,
  Lightning,
  ListChecks,
  LockSimple,
  LockSimpleOpen,
  Medal,
  Moon,
  Note,
  Package,
  PencilSimple,
  Plant,
  Prohibit,
  PuzzlePiece,
  Shield,
  Shuffle,
  Skull,
  Snowflake,
  Sparkle,
  Star,
  Strategy,
  Target,
  Timer,
  TrendUp,
  Trophy,
  Warning,
  XCircle,
  type IconProps,
  type IconWeight,
} from 'phosphor-react-native'
import { colors } from '../../constants/theme'

// Game iconography. These replace the emoji that were previously doing the job
// of UI icons — emoji render differently on every OS version, can't be tinted,
// and don't share optical weight with anything else on screen.
//
// Everything here comes from phosphor so the marks stay in the same visual
// family as CategoryBadge. Each wrapper fixes the weight and default color that
// the mark should always carry, so call sites stay semantic and a currency is
// never accidentally drawn in the wrong hue.

export type GameIconProps = Omit<IconProps, 'weight'> & { weight?: IconWeight }

function make(Mark: React.ComponentType<IconProps>, defaults: Partial<IconProps>) {
  return function GameIcon({ size = 16, weight = 'duotone', color, ...rest }: GameIconProps) {
    return <Mark size={size} weight={weight} color={color ?? defaults.color} {...rest} />
  }
}

/** Coins / currency. Always gold. */
export const CoinIcon = make(Coins, { color: colors.gold })
/** Answer streak. */
export const FlameIcon = make(Fire, { color: colors.streakActive })
/** XP and Blitz mode. */
export const XpIcon = make(Lightning, { color: colors.primary })
/** A remaining life. */
export const LifeIcon = make(Heart, { color: colors.lifeActive })
/** Quest node rating. */
export const StarIcon = make(Star, { color: colors.gold })
/** Fifty-fifty power-up. */
export const HammerIcon = make(Hammer, { color: colors.primaryLight })
/** Shield power-up. */
export const ShieldIcon = make(Shield, { color: colors.primaryLight })
/** Achievement / leaderboard win. */
export const TrophyIcon = make(Trophy, { color: colors.gold })
/** Survival elimination. */
export const SkullIcon = make(Skull, { color: colors.incorrect })
/** Top-tier milestone. */
export const CrownIcon = make(Crown, { color: colors.gold })
/** Podium placement — pass color for gold/silver/bronze. */
export const MedalIcon = make(Medal, { color: colors.gold })
/** Daily challenge target. */
export const TargetIcon = make(Target, { color: colors.primary })
/** Chest / reward. */
export const GiftIcon = make(Gift, { color: colors.primaryLight })
/** Day streak / daily cadence. */
export const CalendarIcon = make(CalendarBlank, { color: colors.textSecondary })
/** Report a bad question. */
export const FlagIcon = make(Flag, { color: colors.textSecondary })
/** Correct answer. */
export const CorrectIcon = make(CheckCircle, { color: colors.correct })
/** Wrong answer. */
export const WrongIcon = make(XCircle, { color: colors.incorrect })
/** Locked content. */
export const LockIcon = make(LockSimple, { color: colors.textDisabled })
/** Celebration moment. */
export const CelebrateIcon = make(Confetti, { color: colors.gold })
/** New / special. */
export const SparkleIcon = make(Sparkle, { color: colors.gold })
/** Time pressure. */
export const TimerIcon = make(Timer, { color: colors.timerWarning })
/** Error / caution state. */
export const WarningIcon = make(Warning, { color: colors.timerWarning })
/** Forward navigation affordance. */
export const NextIcon = make(ArrowRight, { color: colors.textOnAccent })

// ── Keyed registry ───────────────────────────────────────────────────────────
// Constants files (shop items, chest tiers, avatar stages) are plain data and
// must not import JSX. They store one of these keys instead, and the screen
// rendering them resolves it through <GameIcon name={...} />.

export const GAME_ICONS = {
  coin: CoinIcon,
  jackpot: make(Diamond, { color: colors.primaryLight }),
  flame: FlameIcon,
  xp: XpIcon,
  life: LifeIcon,
  star: StarIcon,
  hammer: HammerIcon,
  shield: ShieldIcon,
  trophy: TrophyIcon,
  skull: SkullIcon,
  crown: CrownIcon,
  medal: MedalIcon,
  target: TargetIcon,
  gift: GiftIcon,
  chest: make(Package, { color: colors.bronze }),
  freeze: make(Snowflake, { color: '#7FD4FF' }),
  calendar: CalendarIcon,
  flag: FlagIcon,
  correct: CorrectIcon,
  wrong: WrongIcon,
  lock: LockIcon,
  celebrate: CelebrateIcon,
  sparkle: SparkleIcon,
  timer: TimerIcon,
  warning: WarningIcon,
  edit: make(PencilSimple, { color: colors.textSecondary }),
  unlock: make(LockSimpleOpen, { color: colors.correct }),
  games: make(GameController, { color: colors.primary }),
  note: make(Note, { color: colors.textSecondary }),
  // Rule bullets and mode marks
  brain: make(Brain, { color: colors.primary }),
  list: make(ListChecks, { color: colors.textSecondary }),
  shuffle: make(Shuffle, { color: colors.textSecondary }),
  prohibit: make(Prohibit, { color: colors.textSecondary }),
  endless: make(InfinityIcon, { color: colors.textSecondary }),
  trendUp: make(TrendUp, { color: colors.correct }),
  puzzle: make(PuzzlePiece, { color: '#10B981' }),
  eye: make(Eye, { color: colors.textSecondary }),
  idea: make(Lightbulb, { color: colors.gold }),
  // Avatar progression stages
  seedling: make(Plant, { color: colors.correct }),
  leaf: make(Leaf, { color: '#66BB6A' }),
  scholar: make(GraduationCap, { color: colors.gold }),
  strategist: make(Strategy, { color: '#FF5722' }),
  moon: make(Moon, { color: '#7B8CFF' }),
  cosmos: make(Balloon, { color: '#8B9CFF' }),
} as const

export type GameIconName = keyof typeof GAME_ICONS

/** Render an icon chosen by a data-layer key. */
export function GameIcon({ name, ...props }: GameIconProps & { name: GameIconName }) {
  const Mark = GAME_ICONS[name]
  return <Mark {...props} />
}
