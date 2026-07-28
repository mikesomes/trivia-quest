import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, radius, fontSize } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'

interface TabSwitcherProps<T extends string> {
  tabs: Array<{ id: T; label: string }>
  activeTab: T
  onTabChange: (tab: T) => void
}

export function TabSwitcher<T extends string>({ tabs, activeTab, onTabChange }: TabSwitcherProps<T>) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <AnimatedPressable
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, activeTab === tab.id && styles.activeLabel]}>
            {tab.label}
          </Text>
        </AnimatedPressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeLabel: {
    color: '#fff',
  },
})
