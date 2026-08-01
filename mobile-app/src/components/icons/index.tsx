import React from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import type { IconWeight } from 'phosphor-react-native'
import { AppIcon } from '../ui/AppIcon'
import type { IconName } from '../ui/iconRegistry'

/**
 * Named shortcuts for the marks used most often across game screens.
 *
 * This module is a thin convenience layer over `<AppIcon />` — the marks, their
 * weights, and their default tints all live in `ui/iconRegistry`. Prefer
 * `<AppIcon name="…" />` in new code; these exports exist so the many call
 * sites that already read as `<FlameIcon size={15} />` stay that way.
 */
export type GameIconProps = {
  size?: number
  color?: string
  weight?: IconWeight
  style?: StyleProp<ViewStyle>
  /** Screen-reader text. Omit for icons that sit beside their own label. */
  label?: string
  testID?: string
  /** Render without a wrapper view — required when nesting inside a `<Text>`. */
  inline?: boolean
}

/** Legacy default — these call sites predate the shared `iconSize` scale. */
const DEFAULT_SIZE = 16

function named(name: IconName) {
  return function NamedIcon({ size = DEFAULT_SIZE, ...rest }: GameIconProps) {
    return <AppIcon name={name} size={size} {...rest} />
  }
}

/** Coins / currency. Always gold. */
export const CoinIcon = named('coin')
/** Answer streak. */
export const FlameIcon = named('streak')
/** XP and Blitz mode. */
export const XpIcon = named('xp')
/** A remaining life. */
export const LifeIcon = named('life')
/** Level-up celebration particles. */
export const StarIcon = named('star')
/** Fifty-fifty power-up. */
export const HammerIcon = named('hammer')
/** Shield power-up. */
export const ShieldIcon = named('shield')
/** Achievement / leaderboard win. */
export const TrophyIcon = named('victory')
/** Survival elimination. */
export const SkullIcon = named('skull')
/** Top-tier milestone. */
export const CrownIcon = named('rank')
/** Podium placement — pass color for gold/silver/bronze. */
export const MedalIcon = named('achievement')
/** Daily challenge target. */
export const TargetIcon = named('target')
/** Chest / reward. */
export const GiftIcon = named('gift')
/** Day streak / daily cadence. */
export const CalendarIcon = named('calendar')
/** Report a bad question. */
export const FlagIcon = named('flag')
/** Correct answer. */
export const CorrectIcon = named('correct')
/** Wrong answer. */
export const WrongIcon = named('wrong')
/** Locked content. */
export const LockIcon = named('locked')
/** Celebration moment. */
export const CelebrateIcon = named('celebrate')
/** New / special. */
export const SparkleIcon = named('sparkle')
/** Time pressure. */
export const TimerIcon = named('timer')
/** Error / caution state. */
export const WarningIcon = named('warning')
/** Forward navigation affordance. */
export const NextIcon = named('next')

// ── Keyed registry ───────────────────────────────────────────────────────────
// Constants files (shop items, chest tiers, avatar stages) are plain data and
// must not import JSX. They store one of these keys instead, and the screen
// rendering them resolves it through <GameIcon name={...} />.

export type GameIconName = IconName

/** Render an icon chosen by a data-layer key. */
export function GameIcon({
  name,
  size = DEFAULT_SIZE,
  ...rest
}: GameIconProps & { name: IconName }) {
  return <AppIcon name={name} size={size} {...rest} />
}
