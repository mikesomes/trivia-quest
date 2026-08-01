import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { colors, fontSize, iconSize, radius, spacing } from '../../constants/theme'
import { GAME_CONFIG } from '../../constants/game'
import { haptics } from '../../lib/haptics'
import { SurfaceCard } from '../ui/SurfaceCard'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { AppIcon } from '../ui/AppIcon'
import { MODE_IDENTITY, type GameModeId } from '../ui/GameModeArtwork'

interface Mode {
  id: GameModeId
  label: string
  description: string
  route: Href
}

// Mark and tint come from MODE_IDENTITY so home and the mode-select screen
// cannot drift apart on what a mode looks like. Only the copy is local, since
// these blurbs are trimmed to fit a narrow tile.
const MODES: Mode[] = [
  { id: 'classic', label: 'Classic', description: 'Pick a topic', route: '/game/mode-intro?mode=classic' as Href },
  { id: 'blitz', label: 'Blitz', description: `${GAME_CONFIG.BLITZ_SECONDS}s sprint`, route: '/game/mode-intro?mode=blitz' as Href },
  { id: 'survival', label: 'Survival', description: 'One life', route: '/game/mode-intro?mode=survival' as Href },
]

function ModeCard({ mode }: { mode: Mode }) {
  const { icon, color } = MODE_IDENTITY[mode.id]

  return (
    <AnimatedPressable
      style={styles.cardPressable}
      scaleTo={0.96}
      onPress={() => {
        haptics.confirm()
        router.push(mode.route)
      }}
      accessibilityLabel={`${mode.label}, ${mode.description}`}
    >
      <SurfaceCard
        tone="raised"
        level="low"
        accent={color}
        style={styles.card}
        contentStyle={styles.cardContent}
      >
        {/* A bare mark rather than the tinted GameModeArtwork plate: at this
            size a bordered plate would be a box inside a box, and three of them
            in a row would be the loudest thing on the screen. Identity comes
            from a small area of saturated color instead. */}
        <AppIcon name={icon} size={iconSize.lg} color={color} />
        <View style={styles.cardText}>
          <Text style={styles.label}>{mode.label}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {mode.description}
          </Text>
        </View>
      </SurfaceCard>
    </AnimatedPressable>
  )
}

/** The three game modes, as an even row of tiles. */
export function PlayModes() {
  return (
    <View style={styles.row}>
      {MODES.map(mode => <ModeCard key={mode.id} mode={mode} />)}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // `flex: 1` on three siblings, with no wrapping — an even 3-up at any width.
  cardPressable: { flex: 1 },
  card: {
    // Derived from the tile's own width, so the row stays proportional across
    // screen sizes rather than pinned to a height that only suits one device.
    aspectRatio: 0.82,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  cardText: { alignItems: 'center', gap: 2 },
  label: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  description: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
})
