import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
import { QUEST_CATEGORIES } from '../../src/config/questConfig'
import { useQuestStore } from '../../src/store/questStore'
import { buildCategoryStats } from '../../src/utils/questProgress'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'

export default function QuestHubScreen() {
  const categoryProgress = useQuestStore(s => s.categoryProgress)

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Quest Mode</Text>
        <Text style={styles.subtitle}>Choose a category to begin your journey</Text>

        <View style={styles.grid}>
          {QUEST_CATEGORIES.map(cat => {
            const progress = categoryProgress[cat.id] ?? {
              revealedNodeIds: [],
              completedNodeIds: [],
              bestStars: {},
              categoryXp: 0,
              highestClearedTier: 0,
            }
            const stats = buildCategoryStats(cat, progress)

            return (
              <AnimatedPressable
                key={cat.id}
                style={[styles.card, { borderColor: `${cat.color}55` }]}
                onPress={() => router.push(`/quest/${cat.id}` as never)}
                activeOpacity={0.8}
              >
                {/* Color accent bar */}
                <View style={[styles.accentBar, { backgroundColor: cat.color }]} />

                <View style={styles.cardBody}>
                  <Text style={styles.cardEmoji}>{cat.emoji}</Text>
                  <Text style={styles.cardName} numberOfLines={2}>{cat.name}</Text>

                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: cat.color,
                          width: `${stats.completionPct}%` as any,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>
                      {stats.completedCount}/{stats.totalCount} nodes
                    </Text>
                    {stats.totalStars > 0 && (
                      <Text style={[styles.cardMetaText, { color: colors.streakActive }]}>
                        ★ {stats.totalStars}
                      </Text>
                    )}
                  </View>
                </View>
              </AnimatedPressable>
            )
          })}
        </View>
      </ScrollView>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: -spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '47%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cardMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
})
