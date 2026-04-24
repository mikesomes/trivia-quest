import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { router } from 'expo-router'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { CATEGORIES } from '../../src/constants/categories'
import { useGameStore } from '../../src/store/gameStore'
import { useCreateRound } from '../../src/hooks/useRound'
import { ArrowLeft } from 'phosphor-react-native'
import { getBlitzSegments } from '../../src/utils/difficultyMix'

const CARD_WIDTH = (Dimensions.get('window').width - spacing.lg * 2 - spacing.md) / 2

export default function BlitzCategoryScreen() {
  const setCategory = useGameStore((s) => s.setCategory)
  const setDifficulty = useGameStore((s) => s.setDifficulty)
  const setIsBlitz = useGameStore((s) => s.setIsBlitz)
  const createRound = useCreateRound()

  const handleSelect = async (categoryId: typeof CATEGORIES[0]['id']) => {
    if (createRound.isPending) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setCategory(categoryId)
    setDifficulty('easy')
    setIsBlitz(true)
    try {
      await createRound.mutateAsync({ category: categoryId, difficulty: 'easy', difficultySegments: getBlitzSegments(10), isBlitz: true })
      router.push('/game/play')
    } catch (error) {
      console.error('Failed to create blitz round:', error)
    }
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <ArrowLeft weight="bold" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>⚡ Blitz</Text>
        <Text style={styles.subtitle}>Choose a topic — 60 seconds on the clock</Text>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => {
            const isDisabled = cat.comingSoon || createRound.isPending
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.card,
                  { width: CARD_WIDTH },
                  cat.comingSoon && styles.cardDisabled,
                ]}
                onPress={() => !cat.comingSoon && handleSelect(cat.id)}
                disabled={isDisabled}
                activeOpacity={cat.comingSoon ? 1 : 0.8}
              >
                <LinearGradient
                  colors={cat.comingSoon ? ['#33333322', '#33333308'] : [
                    `${cat.color}33`,
                    `${cat.color}08`,
                  ]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <LinearGradient
                  colors={cat.comingSoon ? ['#666666', '#66666600'] : [
                    cat.color,
                    `${cat.color}00`,
                  ]}
                  style={styles.topLine}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                {cat.comingSoon && (
                  <View style={[styles.badge, styles.comingSoonBadge]}>
                    <Text style={[styles.badgeText, styles.comingSoonBadgeText]}>Coming Soon</Text>
                  </View>
                )}
                <Text style={[styles.emoji, cat.comingSoon && styles.emojiDisabled]}>
                  {cat.emoji}
                </Text>
                <Text style={[styles.label, cat.comingSoon && styles.labelDisabled]}>
                  {cat.label}
                </Text>
                <Text style={[styles.description, cat.comingSoon && styles.descriptionDisabled]} numberOfLines={2}>
                  {cat.description}
                </Text>
                {createRound.isPending && !cat.comingSoon && (
                  <ActivityIndicator style={styles.spinner} size="small" color={cat.color} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {createRound.isError && (
          <Text style={styles.error}>{createRound.error?.message || 'Failed to start round. Try again.'}</Text>
        )}
      </ScrollView>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  back: { padding: spacing.sm, alignSelf: 'flex-start', marginBottom: spacing.xs },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: -spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    gap: spacing.xs,
    minHeight: 170,
  },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.3 },
  emoji: { fontSize: 38, marginTop: spacing.xs },
  label: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.xs },
  description: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 16 },
  cardDisabled: { opacity: 0.5, borderColor: colors.border },
  comingSoonBadge: { backgroundColor: '#66666622', borderColor: '#66666644' },
  comingSoonBadgeText: { color: '#999999' },
  emojiDisabled: { opacity: 0.6 },
  labelDisabled: { color: colors.textSecondary },
  descriptionDisabled: { color: '#888888' },
  spinner: { marginTop: spacing.xs },
  error: { color: colors.incorrect, textAlign: 'center' },
})
