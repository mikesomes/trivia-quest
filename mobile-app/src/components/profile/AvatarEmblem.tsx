import React, { useId } from 'react'
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import { surfaces } from '../../constants/theme'
import { mix, withAlpha } from '../../utils/color'

/**
 * The rank emblem: a polished medallion whose frame gains one element per tier.
 *
 * Everything is drawn in a single 100×100 viewBox and scaled to `size`, so the
 * whole avatar is one SVG node rather than a stack of absolutely-positioned
 * views. That matters for how it looks, not just how it performs — the plate's
 * bevel, rim and frame stay in exact register at any size, and the glow is a
 * real radial falloff instead of a flat disc with a hard edge.
 *
 * The stage glyph is *not* drawn here. It is composed on top in
 * `PlayerAvatar` so it stays a normal `<AppIcon />` and keeps the app's icon
 * weights and accessibility behavior.
 */

/** Radius of the medallion face. */
const R_PLATE = 33
/** Inner frame ring, always drawn. */
const R_RING1 = 38.5
/** Outer frame ring, from tier 3. */
const R_RING2 = 45

/** Point on a circle centered in the viewBox, at a math-convention angle. */
function polar(r: number, deg: number): readonly [number, number] {
  const t = (deg * Math.PI) / 180
  return [50 + r * Math.cos(t), 50 - r * Math.sin(t)]
}

/**
 * An arc between two angles. The viewBox flips y, so increasing angles run
 * counter-clockwise on screen and want SVG's negative sweep flag.
 */
function arc(r: number, fromDeg: number, toDeg: number): string {
  const [x1, y1] = polar(r, fromDeg)
  const [x2, y2] = polar(r, toDeg)
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0
  const sweep = toDeg > fromDeg ? 0 : 1
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/** Regular polygon path centered in the viewBox, first vertex at the top. */
function polygon(r: number, sides: number): string {
  return Array.from({ length: sides }, (_, i) => {
    const [x, y] = polar(r, 90 + (i * 360) / sides)
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ') + ' Z'
}

/** Diamond (square on its point) at an arbitrary center. */
function diamond(cx: number, cy: number, r: number): string {
  return `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`
}

const HEX_FACET = polygon(26, 6)

/**
 * Gradient ids are document-global once these render into the same tree, so a
 * fixed id would make a second emblem on screen inherit the first one's colors.
 * `useId` is per-instance; the strip keeps the result valid inside `url(#…)`.
 */
function useGradientIds() {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '')
  return {
    plate: `plateFill${raw}`,
    sheen: `plateSheen${raw}`,
    facet: `facetFill${raw}`,
    glow: `emblemGlow${raw}`,
  }
}

interface Props {
  tier: number
  color: string
  size: number
  /** Small renders drop the outer frame — below ~60px it collapses into noise. */
  compact?: boolean
}

export function AvatarEmblem({ tier, color, size, compact = false }: Props) {
  // One new element per rank, so the ladder reads as escalation rather than
  // accumulation. At most four frame elements are ever on screen at once.
  const hasPips = tier >= 2
  const hasRing2 = !compact && tier >= 3
  const hasDiagPips = !compact && tier >= 4
  const hasWreath = !compact && tier >= 5
  const hasApex = !compact && tier >= 6

  // Opaque so the medallion reads identically on any surface behind it.
  const plateTop = mix(surfaces.surface2, color, 0.42)
  const plateBottom = mix(surfaces.surface0, color, 0.12)

  const ringTint = tier === 0 ? '#ffffff' : color
  const wreathSpan = hasApex ? 68 : 44
  const id = useGradientIds()

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id.plate} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={plateTop} />
          <Stop offset="1" stopColor={plateBottom} />
        </LinearGradient>

        {/* Specular highlight, upper-left, implying the same light source the
            layered cards on the rest of the app are lit by. */}
        <RadialGradient id={id.sheen} cx="0.36" cy="0.24" r="0.68">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.17} />
          <Stop offset="0.7" stopColor="#ffffff" stopOpacity={0.02} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>

        <LinearGradient id={id.facet} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.06} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* ── Outer frame ── */}
      {hasRing2 && (
        <Circle
          cx={50}
          cy={50}
          r={R_RING2}
          fill="none"
          stroke={withAlpha(color, 0.28)}
          strokeWidth={1}
        />
      )}

      {hasWreath && (
        <>
          <Path
            d={arc(R_RING2, 180 - wreathSpan / 2, 180 + wreathSpan / 2)}
            fill="none"
            stroke={withAlpha(color, 0.8)}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d={arc(R_RING2, -wreathSpan / 2, wreathSpan / 2)}
            fill="none"
            stroke={withAlpha(color, 0.8)}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      )}

      {/* A single diamond at the crown of the frame — the last thing earned. */}
      {hasApex && (
        <Path d={diamond(50, 50 - R_RING2, 3.6)} fill={mix(color, '#ffffff', 0.35)} />
      )}

      {hasDiagPips &&
        [45, 135, 225, 315].map(deg => {
          const [x, y] = polar(R_RING2, deg)
          return <Circle key={`d${deg}`} cx={x} cy={y} r={1.5} fill={withAlpha(color, 0.55)} />
        })}

      {/* ── Inner ring ── */}
      <Circle
        cx={50}
        cy={50}
        r={R_RING1}
        fill="none"
        stroke={withAlpha(ringTint, tier === 0 ? 0.14 : 0.34)}
        strokeWidth={1}
      />

      {hasPips &&
        [0, 90, 180, 270].map(deg => {
          const [x, y] = polar(R_RING1, deg)
          return <Circle key={`p${deg}`} cx={x} cy={y} r={2.1} fill={withAlpha(color, 0.85)} />
        })}

      {/* ── Medallion plate ── */}
      <Circle cx={50} cy={50} r={R_PLATE} fill={`url(#${id.plate})`} />
      <Circle cx={50} cy={50} r={R_PLATE} fill={`url(#${id.sheen})`} />

      {/* Faint cut-stone facet behind the glyph. */}
      <Path d={HEX_FACET} fill={`url(#${id.facet})`} stroke="rgba(255,255,255,0.05)" strokeWidth={0.75} />

      {/* Bevel: light catches the top edge, the bottom edge falls into shade.
          Two arcs read as a machined edge where a uniform ring reads as flat. */}
      <Path
        d={arc(R_PLATE - 1.4, 145, 35)}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d={arc(R_PLATE - 1.4, 215, 325)}
        fill="none"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth={1.6}
        strokeLinecap="round"
      />

      {/* Rim, tightening as rank climbs. */}
      <Circle
        cx={50}
        cy={50}
        r={R_PLATE - 0.9}
        fill="none"
        stroke={withAlpha(color, tier >= 3 ? 0.7 : 0.45)}
        strokeWidth={1.8}
      />
    </Svg>
  )
}

/**
 * The emblem's glow, split into its own node so `PlayerAvatar` can animate it
 * without re-rendering the medallion. A radial falloff rather than a tinted
 * disc — a flat circle at 50% opacity has a hard edge and reads as a sticker.
 */
export function AvatarEmblemGlow({ color, size }: { color: string; size: number }) {
  const id = useGradientIds()
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id.glow} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={color} stopOpacity={0.55} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.28} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill={`url(#${id.glow})`} />
    </Svg>
  )
}
