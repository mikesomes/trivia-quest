import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { Category, Difficulty } from '../../types/game'
import { CATEGORIES } from '../../constants/categories'
import { colors, screenGradient } from '../../constants/theme'
import { tabularNums } from '../ui/Typography'

// ── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   colors.correct,
  medium: colors.timerWarning,
  hard:   colors.incorrect,
}

function getCategoryMeta(category: Category | null) {
  return CATEGORIES.find(c => c.id === category) ?? null
}

// ── Shared card props ─────────────────────────────────────────────────────────

export interface ShareCardData {
  mode: 'regular' | 'daily' | 'sudden-death'
  xpEarned: number
  // Regular / daily / gameover
  answers?: boolean[]        // isCorrect per position
  correctCount?: number
  totalQuestions?: number
  longestStreak?: number
  category?: Category | null
  difficulty?: Difficulty | null
  roundNumber?: number
  // Daily challenge
  dailyStreak?: number
  // Sudden death
  questionsAnswered?: number
}

// ── Main component ────────────────────────────────────────────────────────────

export function ShareCard({ data }: { data: ShareCardData }) {
  const catMeta = getCategoryMeta(data.category ?? null)
  const catColor = catMeta?.color ?? colors.primary
  const diffColor = DIFFICULTY_COLOR[data.difficulty ?? 'medium']

  if (data.mode === 'sudden-death') {
    return <SuddenDeathCard data={data} />
  }

  return (
    <LinearGradient colors={screenGradient} style={styles.card}>
      {/* App header */}
      <View style={styles.appHeader}>
        <Text style={styles.appName}>⚡ TRIVIA QUEST</Text>
        {data.mode === 'daily' && (
          <View style={[styles.modeBadge, { backgroundColor: '#6c63ff33', borderColor: '#6c63ff55' }]}>
            <Text style={[styles.modeBadgeText, { color: colors.primaryLight }]}>DAILY CHALLENGE</Text>
          </View>
        )}
      </View>

      {/* Category + difficulty */}
      {catMeta && (
        <View style={styles.categoryRow}>
          <Text style={styles.categoryEmoji}>{catMeta.emoji}</Text>
          <View style={[styles.categoryPill, { backgroundColor: `${catColor}22`, borderColor: `${catColor}55` }]}>
            <Text style={[styles.categoryLabel, { color: catColor }]}>{catMeta.label.toUpperCase()}</Text>
          </View>
          {data.difficulty && (
            <View style={[styles.diffPill, { backgroundColor: `${diffColor}22`, borderColor: `${diffColor}55` }]}>
              <Text style={[styles.diffLabel, { color: diffColor }]}>{data.difficulty.toUpperCase()}</Text>
            </View>
          )}
        </View>
      )}
      {data.roundNumber && data.roundNumber > 1 && (
        <Text style={styles.roundLabel}>Round {data.roundNumber}</Text>
      )}

      {/* XP */}
      <View style={styles.xpSection}>
        <Text style={styles.xp}>{data.xpEarned.toLocaleString()}</Text>
        <Text style={styles.xpLabel}>XP earned</Text>
      </View>

      {/* Answer grid */}
      {data.answers && data.answers.length > 0 && (
        <View style={styles.grid}>
          {data.answers.map((correct, i) => (
            <View
              key={i}
              style={[styles.gridSquare, { backgroundColor: correct ? colors.correct : colors.incorrect }]}
            />
          ))}
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        {data.correctCount !== undefined && data.totalQuestions !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.correctCount}/{data.totalQuestions}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
        )}
        {data.correctCount !== undefined && data.totalQuestions !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round((data.correctCount / data.totalQuestions) * 100)}%
            </Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        )}
        {data.longestStreak !== undefined && data.longestStreak > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>🔥{data.longestStreak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        )}
        {data.mode === 'daily' && data.dailyStreak !== undefined && data.dailyStreak > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>📅{data.dailyStreak}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
        )}
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <Text style={styles.footerCta}>Can you beat me?</Text>
        <Text style={styles.footerApp}>Play Trivia Quest — free</Text>
      </View>
    </LinearGradient>
  )
}

function SuddenDeathCard({ data }: { data: ShareCardData }) {
  const questionsAnswered = data.questionsAnswered ?? 0
  const difficultyReached = questionsAnswered >= 40 ? 'HARD' : questionsAnswered >= 20 ? 'MEDIUM' : 'EASY'
  const diffColor = questionsAnswered >= 40 ? colors.incorrect : questionsAnswered >= 20 ? colors.timerWarning : colors.correct

  return (
    <LinearGradient colors={[colors.bg, '#1a0f0f']} style={styles.card}>
      <View style={styles.appHeader}>
        <Text style={styles.appName}>⚡ TRIVIA QUEST</Text>
        <View style={[styles.modeBadge, { backgroundColor: '#F4433622', borderColor: '#F4433655' }]}>
          <Text style={[styles.modeBadgeText, { color: colors.incorrect }]}>🔥 SURVIVAL MODE</Text>
        </View>
      </View>

      <View style={styles.sdMain}>
        <Text style={styles.sdCount}>{questionsAnswered}</Text>
        <Text style={styles.sdCountLabel}>questions survived</Text>
        <View style={[styles.diffPill, { backgroundColor: `${diffColor}22`, borderColor: `${diffColor}55`, marginTop: 8 }]}>
          <Text style={[styles.diffLabel, { color: diffColor }]}>REACHED {difficultyReached}</Text>
        </View>
      </View>

      <View style={[styles.statsRow, { marginTop: 0 }]}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.xpEarned.toLocaleString()}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerCta}>Think you can survive longer?</Text>
        <Text style={styles.footerApp}>Play Trivia Quest — free</Text>
      </View>
    </LinearGradient>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: 320,
    borderRadius: 20,
    padding: 24,
    gap: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textOnAccent,
    letterSpacing: 1,
  },
  modeBadge: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryEmoji: { fontSize: 18 },
  categoryPill: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  categoryLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  diffPill: {
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  diffLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  roundLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  xpSection: { alignItems: 'center', gap: 2 },
  xp: { ...tabularNums, fontSize: 56, fontWeight: '900', color: colors.textOnAccent, lineHeight: 62 },
  xpLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
  },
  gridSquare: {
    width: 24,
    height: 24,
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: -4,
  },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { ...tabularNums, fontSize: 18, fontWeight: '800', color: colors.textOnAccent },
  statLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    alignItems: 'center',
    gap: 3,
  },
  footerCta: { fontSize: 13, fontWeight: '700', color: colors.textOnAccent },
  footerApp: { fontSize: 11, color: colors.textSecondary },
  // Sudden death
  sdMain: { alignItems: 'center', gap: 4 },
  sdCount: { ...tabularNums, fontSize: 80, fontWeight: '900', color: colors.textOnAccent, lineHeight: 88 },
  sdCountLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
})
