import React from 'react'
import { ScrollView, Text, StyleSheet, View } from 'react-native'
import { CATEGORIES } from '../../constants/categories'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import type { Category } from '../../types/game'
import { colors, spacing, radius, fontSize } from '../../constants/theme'
import { CategoryIcon } from '../ui/CategoryBadge'

interface CategoryChipsProps {
  activeCategory: Category
  onChange: (category: Category) => void
}

export function CategoryChips({ activeCategory, onChange }: CategoryChipsProps) {
  const live = CATEGORIES.filter((c) => !c.comingSoon && !c.modeOnly)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {live.map((cat) => {
        const active = cat.id === activeCategory
        return (
          <AnimatedPressable
            key={cat.id}
            onPress={() => onChange(cat.id)}
            activeOpacity={0.7}
            style={[
              styles.chip,
              active && { backgroundColor: cat.color, borderColor: cat.color },
            ]}
          >
            <View style={styles.chipInner}>
              <CategoryIcon categoryId={cat.id} size={15} color={active ? colors.textOnAccent : cat.color} />
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {cat.label}
              </Text>
            </View>
          </AnimatedPressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: fontSize.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.textOnAccent,
  },
})
