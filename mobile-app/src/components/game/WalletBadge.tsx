import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import { Coins } from 'phosphor-react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'

interface Props {
  previousCoins: number
  newCoins: number
}

/** A small coin counter that ticks up and bumps when new coins land — the
 * "fly to the wallet" payoff for a round's coin reward. */
export function WalletBadge({ previousCoins, newCoins }: Props) {
  const [displayCoins, setDisplayCoins] = useState(previousCoins)
  const bump = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (newCoins <= previousCoins) {
      setDisplayCoins(newCoins)
      return
    }

    const totalGain = newCoins - previousCoins
    const durationMs = Math.min(1400, Math.max(600, totalGain * 6))
    const steps = Math.min(40, Math.max(16, totalGain))
    const stepMs = durationMs / steps
    let step = 0

    const interval = setInterval(() => {
      step += 1
      const eased = 1 - Math.pow(1 - step / steps, 3)
      setDisplayCoins(Math.round(previousCoins + totalGain * eased))

      if (step >= steps) {
        clearInterval(interval)
        setDisplayCoins(newCoins)
        Animated.sequence([
          Animated.spring(bump, { toValue: 1.25, tension: 200, friction: 4, useNativeDriver: true }),
          Animated.spring(bump, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
        ]).start()
      }
    }, stepMs)

    return () => clearInterval(interval)
  }, [previousCoins, newCoins, bump])

  return (
    <Animated.View style={[styles.badge, { transform: [{ scale: bump }] }]}>
      <Coins weight="duotone" size={14} color="#FFD700" />
      <Text style={styles.text}>{displayCoins.toLocaleString()}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    backgroundColor: '#ffffff12',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#FFD70033',
    marginTop: spacing.xs,
  },
  text: { fontSize: fontSize.sm, fontWeight: '800', color: '#FFD700' },
})
