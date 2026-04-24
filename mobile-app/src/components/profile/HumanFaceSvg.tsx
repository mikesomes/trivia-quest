import React from 'react'
import Svg, { Circle, Path, Ellipse, G, ClipPath, Defs, Rect } from 'react-native-svg'

// Hair styles indexed by tier (0–9)
const HAIR_STYLES = [
  'short',     // 0 Novice
  'short',     // 1 Apprentice
  'medium',    // 2 Scholar
  'medium',    // 3 Expert
  'swept',     // 4 Master
  'swept',     // 5 Champion
  'wild',      // 6 Sage
  'wild',      // 7 Legend
  'regal',     // 8 Mythic
  'regal',     // 9 Immortal
] as const

// Shirt/body color is a muted version of the tier color
function alpha(hex: string, opacity: number) {
  // convert #rrggbb to rgba
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

interface Props {
  tier: number
  tierColor: string
  size: number
}

const SKIN = '#F5CBA7'
const SKIN_DARK = '#D4956A'
const EYE_COLOR = '#1a1a2e'
const PUPIL_COLOR = '#ffffff'

// viewBox is always 0 0 100 100, rendered at `size` px
export function HumanFaceSvg({ tier, tierColor, size }: Props) {
  const hairStyle = HAIR_STYLES[Math.min(tier, HAIR_STYLES.length - 1)]
  const hairColor = tierColor
  const shirtColor = alpha(tierColor, 0.75)
  const shirtHighlight = alpha(tierColor, 0.4)

  // Hair path variants — all clip to the head circle (cx=50, cy=43, r=28)
  function renderHair() {
    switch (hairStyle) {
      case 'short':
        // Simple short cap
        return (
          <Path
            d="M 22,43 A 28,28 0 0,1 78,43 Q 76,18 50,15 Q 24,18 22,43 Z"
            fill={hairColor}
          />
        )
      case 'medium':
        // Slightly longer sides
        return (
          <>
            <Path
              d="M 21,45 A 29,29 0 0,1 79,45 Q 77,14 50,12 Q 23,14 21,45 Z"
              fill={hairColor}
            />
            {/* Side wisps */}
            <Path d="M 21,45 Q 19,55 22,62 Q 23,57 24,52 Z" fill={hairColor} />
            <Path d="M 79,45 Q 81,55 78,62 Q 77,57 76,52 Z" fill={hairColor} />
          </>
        )
      case 'swept':
        // Side-swept, a bit stylish
        return (
          <>
            <Path
              d="M 22,46 A 28,28 0 0,1 78,44 Q 80,14 55,11 Q 28,10 22,46 Z"
              fill={hairColor}
            />
            {/* Swept top tuft */}
            <Path d="M 50,13 Q 62,5 70,12 Q 62,10 55,14 Z" fill={hairColor} opacity={0.9} />
          </>
        )
      case 'wild':
        // Spiky, expressive
        return (
          <>
            <Path
              d="M 22,46 A 28,28 0 0,1 78,44 Q 76,18 50,13 Q 24,18 22,46 Z"
              fill={hairColor}
            />
            {/* Spikes */}
            <Path d="M 38,16 L 34,4 L 42,13 Z" fill={hairColor} />
            <Path d="M 50,13 L 50,1 L 56,12 Z" fill={hairColor} />
            <Path d="M 62,16 L 66,4 L 58,13 Z" fill={hairColor} />
          </>
        )
      case 'regal':
        // Voluminous / powerful look
        return (
          <>
            <Path
              d="M 19,47 A 31,31 0 0,1 81,47 Q 82,12 50,8 Q 18,12 19,47 Z"
              fill={hairColor}
            />
            {/* Volume sides */}
            <Path d="M 19,47 Q 14,60 18,70 Q 20,62 23,54 Z" fill={hairColor} />
            <Path d="M 81,47 Q 86,60 82,70 Q 80,62 77,54 Z" fill={hairColor} />
            {/* Top highlight streak */}
            <Path d="M 44,10 Q 50,7 56,10 Q 50,9 44,10 Z" fill="white" opacity={0.35} />
          </>
        )
    }
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="faceClip">
          <Circle cx={50} cy={43} r={28} />
        </ClipPath>
        <ClipPath id="avatarClip">
          <Rect x={0} y={0} width={100} height={100} rx={50} />
        </ClipPath>
      </Defs>

      <G clipPath="url(#avatarClip)">
        {/* ── Shirt / body / shoulders ── */}
        {/* Collar base */}
        <Ellipse cx={50} cy={98} rx={38} ry={22} fill={shirtColor} />
        {/* Shirt body */}
        <Path
          d="M 12,100 Q 12,78 30,72 Q 38,70 50,69 Q 62,70 70,72 Q 88,78 88,100 Z"
          fill={shirtColor}
        />
        {/* Shirt highlight (center fold) */}
        <Path
          d="M 46,69 Q 50,72 54,69 L 54,100 L 46,100 Z"
          fill={shirtHighlight}
        />
        {/* Collar / neckline V */}
        <Path
          d="M 38,70 Q 50,80 62,70"
          stroke={SKIN_DARK}
          strokeWidth={1}
          fill="none"
          opacity={0.3}
        />

        {/* ── Neck ── */}
        <Path
          d="M 42,68 Q 42,75 50,76 Q 58,75 58,68 Z"
          fill={SKIN}
        />

        {/* ── Head (face circle) ── */}
        <Circle cx={50} cy={43} r={28} fill={SKIN} />

        {/* ── Hair (drawn over head, clipped to head) ── */}
        <G clipPath="url(#faceClip)">
          {renderHair()}
        </G>
        {/* Hair outside clip (for styles that extend beyond) */}
        {(hairStyle === 'medium' || hairStyle === 'regal') && (
          <G>
            {hairStyle === 'medium' && (
              <>
                <Path d="M 21,45 Q 19,55 22,62 Q 23,57 24,52 Z" fill={hairColor} />
                <Path d="M 79,45 Q 81,55 78,62 Q 77,57 76,52 Z" fill={hairColor} />
              </>
            )}
            {hairStyle === 'regal' && (
              <>
                <Path d="M 19,47 Q 14,60 18,70 Q 20,62 23,54 Z" fill={hairColor} />
                <Path d="M 81,47 Q 86,60 82,70 Q 80,62 77,54 Z" fill={hairColor} />
              </>
            )}
          </G>
        )}
        {hairStyle === 'wild' && (
          <>
            <Path d="M 38,16 L 34,4 L 42,13 Z" fill={hairColor} />
            <Path d="M 50,13 L 50,1 L 56,12 Z" fill={hairColor} />
            <Path d="M 62,16 L 66,4 L 58,13 Z" fill={hairColor} />
          </>
        )}
        {hairStyle === 'swept' && (
          <Path d="M 50,13 Q 62,5 70,12 Q 62,10 55,14 Z" fill={hairColor} opacity={0.9} />
        )}

        {/* ── Face features ── */}
        {/* Chin shadow */}
        <Path
          d="M 34,58 Q 50,68 66,58"
          stroke={SKIN_DARK}
          strokeWidth={1.5}
          fill="none"
          opacity={0.25}
        />

        {/* Left eye white */}
        <Ellipse cx={40} cy={45} rx={6} ry={5.5} fill="white" />
        {/* Right eye white */}
        <Ellipse cx={60} cy={45} rx={6} ry={5.5} fill="white" />

        {/* Left iris */}
        <Circle cx={40} cy={46} r={3.5} fill={EYE_COLOR} />
        {/* Right iris */}
        <Circle cx={60} cy={46} r={3.5} fill={EYE_COLOR} />

        {/* Eye shine */}
        <Circle cx={41.5} cy={44.5} r={1.2} fill={PUPIL_COLOR} opacity={0.9} />
        <Circle cx={61.5} cy={44.5} r={1.2} fill={PUPIL_COLOR} opacity={0.9} />

        {/* Eyebrows */}
        <Path
          d="M 34,38 Q 40,35 46,38"
          stroke={hairColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />
        <Path
          d="M 54,38 Q 60,35 66,38"
          stroke={hairColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />

        {/* Mouth — smile */}
        <Path
          d="M 41,55 Q 50,63 59,55"
          stroke={SKIN_DARK}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />

        {/* Cheek blush */}
        <Ellipse cx={32} cy={52} rx={5} ry={3} fill="#FF8A80" opacity={0.18} />
        <Ellipse cx={68} cy={52} rx={5} ry={3} fill="#FF8A80" opacity={0.18} />
      </G>
    </Svg>
  )
}
