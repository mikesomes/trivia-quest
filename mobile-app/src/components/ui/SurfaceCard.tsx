import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { edges, elevation, radius, surfaces } from '../../constants/theme'

/**
 * A layered card that reads as lit from above.
 *
 * Depth on a background this dark cannot come from shadow alone — a drop
 * shadow on `surface0` is nearly invisible. Three cues stack instead, in
 * descending order of how much work they do:
 *
 * 1. **Surface value stepping.** The fill is lighter than the screen, and
 *    lighter at its top edge than its bottom, which implies a light source.
 * 2. **A specular top hairline.** One pixel of white alpha along the top edge.
 * 3. **A soft neutral drop shadow**, which seats the card rather than defining it.
 *
 * Structure exists to work around an iOS quirk: `overflow: 'hidden'` maps to
 * `clipsToBounds` and clips the shadow away, so the shadow and the clip must
 * live on different nodes.
 *
 *     wrapper   shadow + opaque fill, never clipped
 *       clip    rounded, overflow hidden, hairline border
 *         …     gradient fill, accent wash, top highlight, content
 *
 * Prefer this over `GradientCard` for anything that should feel raised —
 * `GradientCard` clips on the same node as its background and so cannot cast a
 * shadow at all.
 */

/** How light the fill is, i.e. how far the surface sits off the background. */
export type SurfaceTone = 'raised' | 'resting'

/** How far the card floats. `none` keeps the fill but drops the shadow. */
export type SurfaceLevel = 'none' | 'low' | 'medium'

const TONE_FILL: Record<SurfaceTone, readonly [string, string]> = {
  raised: [surfaces.surface3, surfaces.surface2],
  resting: [surfaces.surface2, surfaces.surface1],
}

const TONE_HIGHLIGHT: Record<SurfaceTone, string> = {
  raised: edges.highlightStrong,
  resting: edges.highlightSoft,
}

interface SurfaceCardProps {
  children: React.ReactNode
  tone?: SurfaceTone
  level?: SurfaceLevel
  /** Optional accent wash over the top of the card. Kept deliberately faint. */
  accent?: string
  cornerRadius?: number
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  testID?: string
}

export function SurfaceCard({
  children,
  tone = 'resting',
  level = 'low',
  accent,
  cornerRadius = radius.lg,
  style,
  contentStyle,
  testID,
}: SurfaceCardProps) {
  const fill = TONE_FILL[tone]

  return (
    <View
      testID={testID}
      style={[
        // The opaque fill is load-bearing: without it iOS derives the shadow
        // from the content's alpha channel, which is slow and rings the edges.
        { backgroundColor: fill[1], borderRadius: cornerRadius },
        level !== 'none' && elevation[level],
        style,
      ]}
    >
      <View style={[styles.clip, { borderRadius: cornerRadius }]}>
        <LinearGradient
          colors={fill}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
        />
        {accent && (
          <LinearGradient
            colors={[`${accent}14`, 'transparent']}
            style={styles.wash}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />
        )}
        <View
          style={[styles.highlight, { backgroundColor: TONE_HIGHLIGHT[tone] }]}
          pointerEvents="none"
        />
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: edges.hairline,
    // `flexGrow` rather than `flex`: with an auto-height wrapper this is inert
    // and the card sizes to its content, but when the wrapper has a definite
    // height (an `aspectRatio`, say) the clip fills it instead of leaving a gap.
    flexGrow: 1,
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
})
