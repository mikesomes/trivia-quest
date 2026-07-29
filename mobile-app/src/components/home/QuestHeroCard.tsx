import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MapTrifold } from 'phosphor-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, fontSize, iconSize, radius } from '../../constants/theme'
import { AppIcon } from '../ui/AppIcon'
import { AnimatedPressable } from '../ui/AnimatedPressable'

interface QuestHeroCardProps {
  totalNodes: number
  completedNodes: number
  isLoading: boolean
  onPress: () => void
}

export function QuestHeroCard({ totalNodes, completedNodes, isLoading, onPress }: QuestHeroCardProps) {
  const hasProgress = completedNodes > 0
  const pct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

  return (
    <AnimatedPressable onPress={onPress} activeOpacity={0.85} style={styles.wrapper}>
      <View style={styles.card}>
        <LinearGradient
          colors={[`${colors.primary}22`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', `${colors.primary}cc`, 'transparent']}
          style={styles.topLine}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          pointerEvents="none"
        />

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <MapTrifold weight="duotone" size={22} color={colors.primary} />
              <Text style={styles.title}>TRIVIA QUEST</Text>
            </View>
            {!isLoading && totalNodes > 0 && (
              <Text style={styles.nodeCount}>{pct}% explored</Text>
            )}
          </View>

          {!isLoading && totalNodes > 0 && (
            <View style={styles.dotsRow}>
              {Array.from({ length: totalNodes }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < completedNodes ? styles.dotComplete : styles.dotEmpty]}
                />
              ))}
            </View>
          )}

          <AnimatedPressable style={styles.cta} onPress={onPress} activeOpacity={0.8}>
            <Text style={styles.ctaText}>
              {hasProgress ? 'Continue Journey' : 'Begin Your Journey'}
            </Text>
            <AppIcon name="next" size={iconSize.md} color={colors.textPrimary} />
          </AnimatedPressable>
        </View>
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: `${colors.primary}55`,
    overflow: 'hidden',
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  nodeCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotComplete: {
    backgroundColor: colors.primary,
  },
  dotEmpty: {
    backgroundColor: colors.border,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  ctaText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
})
