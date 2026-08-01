import React from 'react'
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, iconSize } from '../../constants/theme'
import { AppIcon } from './AppIcon'
import type { IconName } from './iconRegistry'

/**
 * Illustration for a primary game-mode card.
 *
 * Game modes are the app's headline choice, so they get a dedicated piece of
 * artwork rather than the same interface mark used in a list row. Until real
 * artwork is drawn, each mode falls back to its Phosphor mark on the same
 * tinted plate — identical footprint and silhouette, so dropping art in later
 * is a one-line change with no layout churn.
 *
 * Every variant draws on the same gradient plate, so a half-finished art set
 * still looks deliberate rather than mismatched.
 *
 * ## Adding artwork
 *
 * Prefer SVG. `react-native-svg` is already a dependency, and a vector emblem
 * stays crisp at every size, tints to the mode's accent color, ships as one
 * file instead of an `@1x/@2x/@3x` set, and costs a few KB:
 *
 * ```tsx
 * import ClassicEmblem from '../../../assets/game-modes/ClassicEmblem'
 *
 * const MODE_ARTWORK = {
 *   classic: svgArtwork(ClassicEmblem),
 *   ...
 * }
 * ```
 *
 * Raster still works where a vector would be impractical:
 *
 * ```tsx
 * classic: imageArtwork(require('../../../assets/game-modes/classic.png')),
 * ```
 *
 * Paths must be literal — a computed `require(...)` breaks Metro and web
 * bundling.
 *
 * Only original or properly licensed artwork belongs here. Nothing in this
 * component ships third-party assets, so the app carries no icon-set
 * attribution obligation.
 */

export type GameModeId = 'classic' | 'blitz' | 'survival'

/**
 * The contract an SVG emblem implements. Deliberately not typed against
 * `react-native-svg` — artwork only needs to accept a size and the mode's
 * accent color, which keeps this module decoupled from how the art is drawn.
 */
export interface ModeArtworkSvgProps {
  /** Edge length in px. Art should fill this square. */
  size: number
  /** The mode's accent color, for emblems that tint to the theme. */
  color: string
}

/**
 * A tagged union rather than "component or image source" — `require()` returns
 * an opaque number and `React.memo` returns an object, so runtime sniffing
 * would be guesswork. The tag makes each registration unambiguous.
 */
export type ModeArtwork =
  | { kind: 'image'; source: ImageSourcePropType }
  | { kind: 'svg'; Component: React.ComponentType<ModeArtworkSvgProps> }

export const imageArtwork = (source: ImageSourcePropType): ModeArtwork => ({ kind: 'image', source })

export const svgArtwork = (Component: React.ComponentType<ModeArtworkSvgProps>): ModeArtwork => ({
  kind: 'svg',
  Component,
})

/**
 * Real artwork, when it exists. Every entry is `null` today, which is what
 * routes each mode to its Phosphor fallback. Modes can be filled in one at a
 * time.
 */
const MODE_ARTWORK: Record<GameModeId, ModeArtwork | null> = {
  classic: null,
  blitz: null,
  survival: null,
}

/**
 * The mark each mode falls back to, and the tint its plate carries.
 *
 * Exported so surfaces that draw a mode without this plate — the home screen
 * shows a bare mark on a calmer card — still agree on what Blitz looks like.
 * One source of truth for mode identity, whatever frames it.
 */
export const MODE_IDENTITY: Record<GameModeId, { icon: IconName; color: string }> = {
  classic: { icon: 'trivia', color: colors.primary },
  blitz: { icon: 'quickPlay', color: colors.gold },
  survival: { icon: 'skull', color: colors.incorrect },
}

/** Whether a mode has real artwork yet — useful for art-review screens. */
export function hasModeArtwork(mode: GameModeId): boolean {
  return MODE_ARTWORK[mode] !== null
}

interface Props {
  mode: GameModeId
  /** Edge length of the square plate. Defaults to the game-mode icon scale. */
  size?: number
  style?: StyleProp<ViewStyle>
  /**
   * Screen-reader text. Omit on cards that already show the mode name —
   * the artwork is decorative there.
   */
  label?: string
  testID?: string
}

export function GameModeArtwork({ mode, size = iconSize.gameMode, style, label, testID }: Props) {
  const artwork = MODE_ARTWORK[mode]
  const { icon, color } = MODE_IDENTITY[mode]

  // The plate owns the accessibility semantics for every variant, so art and
  // fallback announce identically and nothing double-reads.
  const a11y: Partial<React.ComponentProps<typeof View>> = label
    ? { accessible: true, accessibilityRole: 'image', accessibilityLabel: label }
    : {
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      }

  return (
    <View
      style={[
        styles.plate,
        { width: size, height: size, borderRadius: Math.round(size * 0.28), borderColor: `${color}55` },
        style,
      ]}
      testID={testID}
      {...a11y}
    >
      <LinearGradient
        colors={[`${color}44`, `${color}14`]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      {/* Inner top highlight — reads as depth, matching CategoryBadge's tile. */}
      <LinearGradient
        colors={['#ffffff26', '#ffffff00']}
        style={styles.highlight}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {artwork === null ? (
        <AppIcon name={icon} size={Math.round(size * 0.55)} color={color} />
      ) : artwork.kind === 'svg' ? (
        <artwork.Component size={size} color={color} />
      ) : (
        <Image source={artwork.source} style={styles.artwork} resizeMode="contain" />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  plate: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
})
