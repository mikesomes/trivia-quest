import React from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import type { IconWeight } from 'phosphor-react-native'
import { iconSize } from '../../constants/theme'
import { ICONS, type IconName } from './iconRegistry'

export type IconSizeToken = keyof typeof iconSize

export interface AppIconProps {
  /** Semantic icon name from the registry — not a Phosphor component name. */
  name: IconName
  /** A token from the shared scale, or an explicit pixel size when a layout needs one. */
  size?: IconSizeToken | number
  /** Overrides the registry's default tint. */
  color?: string
  /** Overrides the registry's default weight. */
  weight?: IconWeight
  style?: StyleProp<ViewStyle>
  /**
   * What a screen reader should announce. Provide this only when the icon
   * carries meaning that no adjacent text already conveys — an icon next to its
   * own label is decorative and should stay silent, or the label gets read
   * twice. Omitting it hides the icon from assistive tech.
   */
  label?: string
  testID?: string
  /**
   * Render the bare mark with no wrapping view. Use this **only** inside a
   * `<Text>`, where a nested `View` breaks inline flow on native and produces
   * invalid markup on web. The surrounding text supplies the accessible name,
   * so `label` is ignored here.
   */
  inline?: boolean
}

/**
 * The app's icon primitive. Every mark should be drawn through this component
 * so weight, tint, sizing, and accessibility stay consistent.
 *
 * Icons are wrapped in a View because Phosphor's `IconProps` has no
 * accessibility fields — the wrapper is what carries the semantics.
 */
export function AppIcon({
  name,
  size = 'md',
  color,
  weight,
  style,
  label,
  testID,
  inline = false,
}: AppIconProps) {
  const spec = ICONS[name]
  const Mark = spec.mark
  const px = typeof size === 'number' ? size : iconSize[size]
  const weightToUse = weight ?? spec.weight
  const colorToUse = color ?? spec.color

  if (inline) {
    return <Mark size={px} weight={weightToUse} color={colorToUse} style={style} testID={testID} />
  }

  const a11y: Partial<React.ComponentProps<typeof View>> = label
    ? { accessible: true, accessibilityRole: 'image', accessibilityLabel: label }
    : {
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      }

  return (
    <View style={style} testID={testID} {...a11y}>
      <Mark size={px} weight={weight ?? spec.weight} color={color ?? spec.color} />
    </View>
  )
}

export { type IconName } from './iconRegistry'
