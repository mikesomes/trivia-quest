import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { getAvatarStage, getAvatarTier } from '../../constants/avatarStages'
import { mix } from '../../utils/color'
import { AppIcon } from '../ui/AppIcon'
import { AvatarEmblem, AvatarEmblemGlow } from './AvatarEmblem'

interface Props {
  level: number
  size?: 'sm' | 'lg'
}

/** Emblem box, in px. The frame reaches the edge, so this is the full footprint. */
const BOX = { sm: 56, lg: 136 } as const

/**
 * The glyph is sized against the medallion plate rather than the box: the plate
 * is `R_PLATE * 2 / 100` of the emblem, and the mark should fill a little under
 * two-thirds of it so the bevel and facet still read around it.
 */
const GLYPH_RATIO = 0.40

/** How far the glow extends past the emblem. */
const GLOW_PAD = { sm: 10, lg: 26 } as const

export function PlayerAvatar({ level, size = 'lg' }: Props) {
  const stage = getAvatarStage(level)
  const tier = getAvatarTier(level)
  const isLg = size === 'lg'

  const box = BOX[size]
  const glowSize = box + GLOW_PAD[size] * 2

  // The glow breathes only in the last three ranks, slowly and over a narrow
  // range. A pulse that reads at a glance is the arcade tell this design is
  // moving away from — this should only be noticeable if you rest on it.
  const breathes = tier >= 4
  const breathe = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!breathes) {
      breathe.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [breathes, breathe])

  // Rest opacity climbs with rank; the animated range sits just above it.
  const restOpacity = Math.min(0.16 + tier * 0.05, 0.42)
  const glowOpacity = breathes
    ? breathe.interpolate({ inputRange: [0, 1], outputRange: [restOpacity, restOpacity + 0.14] })
    : restOpacity
  const glowScale = breathes
    ? breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })
    : 1

  const glyphColor = mix(stage.color, '#ffffff', 0.62)

  return (
    <View
      style={[styles.root, { width: box, height: box }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${stage.title} emblem, level ${level}`}
    >
      <Animated.View
        style={[
          styles.centered,
          {
            width: glowSize,
            height: glowSize,
            marginLeft: -glowSize / 2,
            marginTop: -glowSize / 2,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
        pointerEvents="none"
      >
        <AvatarEmblemGlow color={stage.color} size={glowSize} />
      </Animated.View>

      <AvatarEmblem tier={tier} color={stage.color} size={box} compact={!isLg} />

      <View style={styles.glyph} pointerEvents="none">
        <AppIcon name={stage.icon} size={Math.round(box * GLYPH_RATIO)} color={glyphColor} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Positioned from the center out so the glow can overflow the box evenly.
  centered: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  glyph: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
