import React, { useEffect, useRef } from 'react'
import { View, Animated } from 'react-native'
import { getAvatarStage, AVATAR_STAGES } from '../../constants/avatarStages'
import { colors } from '../../constants/theme'
import { HumanFaceSvg } from './HumanFaceSvg'
import { CrownIcon } from '../icons'

interface Props {
  level: number
  size?: 'sm' | 'lg'
}

// Maps level → tier index 0–9 (matches AVATAR_STAGES)
function getAvatarTier(level: number): number {
  for (let i = AVATAR_STAGES.length - 1; i >= 0; i--) {
    if (level >= AVATAR_STAGES[i].minLevel) return i
  }
  return 0
}

// Layout constants
const LG_CIRCLE = 88
const SM_CIRCLE = 52
const LG_CONTAINER = 150
const SM_CONTAINER = 64

export function PlayerAvatar({ level, size = 'lg' }: Props) {
  const stage = getAvatarStage(level)
  const tier = getAvatarTier(level)
  const color = stage.color
  const isLg = size === 'lg'

  const circleSize = isLg ? LG_CIRCLE : SM_CIRCLE
  const containerSize = isLg ? LG_CONTAINER : SM_CONTAINER
  const half = circleSize / 2
  const cc = containerSize / 2 // container center for absolute positioning

  // Ring dimensions (lg only)
  const ring1Gap = 11
  const ring1Radius = half + ring1Gap       // radius of first outer ring
  const ring2Gap = 9
  const ring2Radius = ring1Radius + ring2Gap // radius of second outer ring

  // Glow animation (starts at tier 2)
  const glowAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (tier < 2) {
      glowAnim.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [tier])

  const maxOpacity = tier >= 9 ? 0.60 : tier >= 7 ? 0.48 : tier >= 5 ? 0.36 : tier >= 3 ? 0.26 : 0.16
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, maxOpacity] })
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, tier >= 8 ? 1.14 : tier >= 6 ? 1.10 : tier >= 4 ? 1.07 : 1.04],
  })

  // Helper: compute absolute (left, top) for an element at a given orbit radius and angle
  function orbitPos(angle: number, orbitR: number, elemSize: number) {
    return {
      left: cc + orbitR * Math.cos(angle) - elemSize / 2,
      top: cc + orbitR * Math.sin(angle) - elemSize / 2,
    }
  }

  // Feature flags per tier
  const hasBgTint       = tier >= 1
  const hasGlow         = tier >= 2
  const hasCardinalDots = isLg && tier >= 2
  const hasOuterRing1   = isLg && tier >= 3
  const hasDiagDots     = isLg && tier >= 4
  const hasRays         = isLg && tier >= 5
  const hasOuterRing2   = isLg && tier >= 6
  const hasCrown        = isLg && tier >= 7
  const hasConstDots    = isLg && tier >= 7
  const maxEverything   = tier >= 9

  const borderWidth = tier >= 5 ? 3 : tier >= 2 ? 2.5 : 2

  // Ray appearance scales with tier
  const rayLen = maxEverything ? 16 : tier >= 7 ? 13 : tier >= 6 ? 10 : 7
  // Rays are positioned just outside ring1 (if present), or just outside the circle
  const rayOrbitR = hasOuterRing1 ? ring1Radius + 5 + rayLen / 2 : half + 6 + rayLen / 2

  // Constellation dot orbit
  const constOrbitR = hasOuterRing2 ? ring2Radius + 7 : ring1Radius + 7

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Crown — tier 7 (Legend) and above */}
      {hasCrown && (
        <View style={{ marginBottom: 4 }}><CrownIcon size={isLg ? 24 : 16} weight="fill" /></View>
      )}

      <View style={{ width: containerSize, height: containerSize, alignItems: 'center', justifyContent: 'center' }}>

        {/* ── Glow blob (behind everything) ── */}
        {hasGlow && (
          <Animated.View
            style={{
              position: 'absolute',
              width: circleSize + (isLg ? 40 : 24),
              height: circleSize + (isLg ? 40 : 24),
              borderRadius: (circleSize + (isLg ? 40 : 24)) / 2,
              backgroundColor: color,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            }}
          />
        )}

        {/* ── Outer ring 2 (tier 6+) ── */}
        {hasOuterRing2 && (
          <View
            style={{
              position: 'absolute',
              width: ring2Radius * 2,
              height: ring2Radius * 2,
              borderRadius: ring2Radius,
              borderWidth: maxEverything ? 1.5 : 1,
              borderColor: color,
              opacity: maxEverything ? 0.6 : 0.4,
            }}
          />
        )}

        {/* ── Outer ring 1 (tier 3+) ── */}
        {hasOuterRing1 && (
          <View
            style={{
              position: 'absolute',
              width: ring1Radius * 2,
              height: ring1Radius * 2,
              borderRadius: ring1Radius,
              borderWidth: tier >= 7 ? 2 : 1.5,
              borderColor: color,
              opacity: tier >= 7 ? 0.9 : tier >= 5 ? 0.75 : 0.55,
            }}
          />
        )}

        {/* ── 8 radiating rays (tier 5+) ── */}
        {hasRays && Array.from({ length: 8 }, (_, i) => {
          const angle = (i * 2 * Math.PI) / 8 - Math.PI / 2
          const pos = orbitPos(angle, rayOrbitR, 2)
          return (
            <View
              key={`ray-${i}`}
              style={{
                position: 'absolute',
                width: 2,
                height: rayLen,
                backgroundColor: color,
                borderRadius: 1,
                left: pos.left,
                top: pos.top,
                transform: [{ rotate: `${i * 45}deg` }],
                opacity: 0.75,
              }}
            />
          )
        })}

        {/* ── 4 cardinal dots (tier 2+) ── */}
        {hasCardinalDots && [0, 1, 2, 3].map(i => {
          const dotSize = 6
          const dotOrbitR = hasOuterRing1 ? ring1Radius : half + 8
          const angle = (i * 2 * Math.PI) / 4 - Math.PI / 2
          const pos = orbitPos(angle, dotOrbitR, dotSize)
          return (
            <View
              key={`cdot-${i}`}
              style={{
                position: 'absolute',
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                left: pos.left,
                top: pos.top,
              }}
            />
          )
        })}

        {/* ── 4 diagonal dots (tier 4+) ── */}
        {hasDiagDots && [0, 1, 2, 3].map(i => {
          const dotSize = 4
          const dotOrbitR = hasOuterRing1 ? ring1Radius : half + 8
          const angle = (i * 2 * Math.PI) / 4 - Math.PI / 2 + Math.PI / 4
          const pos = orbitPos(angle, dotOrbitR, dotSize)
          return (
            <View
              key={`ddot-${i}`}
              style={{
                position: 'absolute',
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                left: pos.left,
                top: pos.top,
                opacity: 0.65,
              }}
            />
          )
        })}

        {/* ── Constellation ring (tier 7+) ── */}
        {hasConstDots && Array.from({ length: maxEverything ? 8 : 6 }, (_, i) => {
          const count = maxEverything ? 8 : 6
          const dotSize = maxEverything ? 5 : 4
          const angle = (i * 2 * Math.PI) / count + Math.PI / 6
          const pos = orbitPos(angle, constOrbitR, dotSize)
          return (
            <View
              key={`const-${i}`}
              style={{
                position: 'absolute',
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                left: pos.left,
                top: pos.top,
                opacity: 0.85,
              }}
            />
          )
        })}

        {/* ── Main circle ── */}
        <View
          style={{
            width: circleSize,
            height: circleSize,
            borderRadius: half,
            backgroundColor: hasBgTint ? `${color}1a` : colors.bgCard,
            borderWidth,
            borderColor: color,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          <HumanFaceSvg tier={tier} tierColor={color} size={circleSize} />
        </View>
      </View>
    </View>
  )
}
