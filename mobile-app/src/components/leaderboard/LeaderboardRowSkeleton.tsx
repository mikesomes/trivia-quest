import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { colors, radius, spacing } from '../../constants/theme'

export function LeaderboardRowSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View style={[styles.row, { opacity }]}>
      <View style={styles.rankBlock} />
      <View style={styles.infoCol}>
        <View style={styles.nameBar} />
        <View style={styles.subBar} />
      </View>
      <View style={styles.valueBar} />
    </Animated.View>
  )
}

export function LeaderboardSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => <LeaderboardRowSkeleton key={i} />)}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  rankBlock: {
    width: 36,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
  },
  infoCol: { flex: 1, gap: 6 },
  nameBar: {
    height: 14,
    width: '55%',
    borderRadius: 4,
    backgroundColor: colors.bgCard,
  },
  subBar: {
    height: 10,
    width: '30%',
    borderRadius: 4,
    backgroundColor: colors.bgCard,
  },
  valueBar: {
    height: 18,
    width: 56,
    borderRadius: 4,
    backgroundColor: colors.bgCard,
  },
})
