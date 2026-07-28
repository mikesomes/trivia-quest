import React, { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet } from 'react-native'
import { colors, spacing, fontSize } from '../../constants/theme'
import { GAME_CONFIG } from '../../constants/game'
import { LifeIcon, ShieldIcon, SparkleIcon } from '../icons'
import { livesMessage } from '../../lib/a11y'

const ICON_SIZE = fontSize.xl

interface LivesDisplayProps {
  livesRemaining: number
  shieldsRemaining?: number
  shieldBreakToken?: number
}

export function LivesDisplay({
  livesRemaining,
  shieldsRemaining = 0,
  shieldBreakToken = 0,
}: LivesDisplayProps) {
  const burstOpacity = useRef(new Animated.Value(0)).current
  const burstScale = useRef(new Animated.Value(0.65)).current
  const burstY = useRef(new Animated.Value(-4)).current

  useEffect(() => {
    if (shieldBreakToken <= 0) return

    burstOpacity.setValue(1)
    burstScale.setValue(0.65)
    burstY.setValue(-4)

    Animated.parallel([
      Animated.sequence([
        Animated.timing(burstScale, {
          toValue: 1.15,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(burstScale, {
          toValue: 0.92,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(burstOpacity, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(burstY, {
          toValue: -10,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(burstY, {
          toValue: -18,
          duration: 230,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [burstOpacity, burstScale, burstY, shieldBreakToken])

  const showShieldGroup = shieldsRemaining > 0 || shieldBreakToken > 0

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        livesMessage(livesRemaining) +
        (shieldsRemaining > 0 ? `, ${shieldsRemaining} shield${shieldsRemaining === 1 ? '' : 's'}` : '')
      }
    >
      {showShieldGroup && (
        <View style={styles.shieldGroup}>
          {Array.from({ length: shieldsRemaining }, (_, i) => (
            <ShieldIcon key={`shield-${i}`} size={ICON_SIZE} weight="fill" />
          ))}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shieldBurst,
              {
                opacity: burstOpacity,
                transform: [{ translateY: burstY }, { scale: burstScale }],
              },
            ]}
          >
            <SparkleIcon size={ICON_SIZE} weight="fill" color={colors.primaryLight} />
          </Animated.View>
        </View>
      )}

      {Array.from({ length: GAME_CONFIG.MAX_LIVES }, (_, i) => {
        const spent = i >= livesRemaining
        return (
          <View key={i} style={spent ? styles.empty : styles.active}>
            <LifeIcon
              size={ICON_SIZE}
              weight={spent ? 'regular' : 'fill'}
              color={spent ? colors.textDisabled : colors.lifeActive}
            />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  shieldGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 24,
    marginRight: spacing.xs,
  },
  shieldBurst: {
    position: 'absolute',
    left: 0,
  },
  active: {
    opacity: 1,
  },
  empty: {
    opacity: 0.25,
  },
})
