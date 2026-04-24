import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { router } from 'expo-router'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { ArrowLeft } from 'phosphor-react-native'

const MODES = [
  {
    id: 'classic',
    emoji: '🧠',
    label: 'Classic',
    description: 'Pick a topic, 10 questions, earn XP',
    color: colors.primary,
    route: '/game/mode-intro?mode=classic',
  },
  {
    id: 'blitz',
    emoji: '⚡',
    label: 'Blitz',
    description: '60 seconds, unlimited questions, no hammers',
    color: '#FFD700',
    route: '/game/mode-intro?mode=blitz',
  },
  {
    id: 'survival',
    emoji: '💀',
    label: 'Survival',
    description: 'One life, endless rounds, go as far as you can',
    color: '#F44336',
    route: '/game/mode-intro?mode=survival',
  },
] as const

export default function ModeSelectScreen() {
  const handleSelect = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push(route as Parameters<typeof router.push>[0])
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <ArrowLeft weight="bold" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Game Mode</Text>
        <Text style={styles.subtitle}>How do you want to play?</Text>

        <View style={styles.list}>
          {MODES.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={styles.card}
              onPress={() => handleSelect(mode.route)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[`${mode.color}33`, `${mode.color}08`]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <LinearGradient
                colors={[mode.color, `${mode.color}00`]}
                style={styles.topLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <View style={styles.cardRow}>
                <Text style={styles.emoji}>{mode.emoji}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.label}>{mode.label}</Text>
                  <Text style={styles.description}>{mode.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 40 },
  cardText: { flex: 1, gap: spacing.xs },
  label: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary },
  description: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
})
