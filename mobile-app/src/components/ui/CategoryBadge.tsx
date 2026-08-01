import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { IconWeight } from 'phosphor-react-native'
import { colors, iconSize, radius } from '../../constants/theme'
import type { CategoryMeta } from '../../constants/categories'
import { AppIcon } from './AppIcon'
import { categoryIconName } from './iconRegistry'

// Replaces emoji-as-iconography: one duotone mark per category on a gradient
// squircle tile tinted with the category's accent color. The id-to-mark table
// lives in the icon registry so a category reads the same here, in the
// category picker, and on an achievement badge.
export { categoryIconName, CATEGORY_ICON_NAMES } from './iconRegistry'

interface CategoryIconProps {
  categoryId: string
  size?: number
  color?: string
  weight?: IconWeight
  /** Screen-reader text. Omit where the category name is already on screen. */
  label?: string
}

/** The bare category mark, no tile. Use inline — chips, badges, title rows —
 * where CategoryBadge's squircle would be too heavy. */
export function CategoryIcon({
  categoryId,
  size = iconSize.sm,
  color,
  weight = 'duotone',
  label,
}: CategoryIconProps) {
  return (
    <AppIcon
      name={categoryIconName(categoryId)}
      size={size}
      weight={weight}
      color={color ?? colors.textSecondary}
      label={label}
    />
  )
}

interface CategoryBadgeProps {
  category: Pick<CategoryMeta, 'id' | 'color'>
  size?: number
  muted?: boolean
}

export function CategoryBadge({ category, size = 48, muted = false }: CategoryBadgeProps) {
  const color = muted ? colors.textDisabled : category.color
  const markSize = Math.round(size * 0.55)

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
      <AppIcon name={categoryIconName(category.id)} size={markSize} color={color} />
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
