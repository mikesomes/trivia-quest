import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Bank,
  Brain,
  FilmSlate,
  FilmStrip,
  Flask,
  Football,
  GlobeHemisphereWest,
  MagicWand,
  MusicNotes,
  Palette,
  PuzzlePiece,
  Quotes,
  Scroll,
  SoccerBall,
  Star,
  type IconProps,
} from 'phosphor-react-native'
import { colors, radius } from '../../constants/theme'
import type { CategoryMeta } from '../../constants/categories'

// Replaces emoji-as-iconography: one duotone mark per category on a gradient
// squircle tile tinted with the category's accent color.
const CATEGORY_ICONS: Record<string, React.ComponentType<IconProps>> = {
  general_knowledge: Brain,
  history: Scroll,
  science: Flask,
  sports: SoccerBall,
  movies_tv: FilmSlate,
  geography: GlobeHemisphereWest,
  nfl_football: Football,
  roman_history: Bank,
  harry_potter: MagicWand,
  famous_quotes: Quotes,
  music: MusicNotes,
  odd_one_out: PuzzlePiece,
  art_history: Palette,
  movie_quotes: FilmStrip,
  pop_culture: Star,
}

interface CategoryBadgeProps {
  category: Pick<CategoryMeta, 'id' | 'color'>
  size?: number
  muted?: boolean
}

export function CategoryBadge({ category, size = 48, muted = false }: CategoryBadgeProps) {
  const Icon = CATEGORY_ICONS[category.id] ?? Brain
  const color = muted ? colors.textDisabled : category.color
  const iconSize = Math.round(size * 0.55)

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * (radius.md / 48)) + 6,
          borderColor: `${color}55`,
        },
      ]}
    >
      <LinearGradient
        colors={[`${color}44`, `${color}14`]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      {/* Inner top highlight — reads as depth at a glance */}
      <LinearGradient
        colors={['#ffffff26', '#ffffff00']}
        style={styles.highlight}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <Icon weight="duotone" size={iconSize} color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
})
