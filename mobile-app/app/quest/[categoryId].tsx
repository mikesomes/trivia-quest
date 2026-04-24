import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { QUEST_CATEGORY_MAP } from '../../src/config/questConfig'
import { useQuestStore } from '../../src/store/questStore'
import { getNodeStatus, getCreateRoundParams } from '../../src/utils/questProgress'
import { useGameStore } from '../../src/store/gameStore'
import { roundsApi } from '../../src/api/rounds'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import type { QuestNode } from '../../src/types/quest'

const MODE_LABELS: Record<string, string> = {
  classic:  'Classic',
  timed:    'Timed',
  survival: 'Survival',
  boss:     'Boss',
}

const MODE_EMOJI: Record<string, string> = {
  classic:  '📝',
  timed:    '⚡',
  survival: '💀',
  boss:     '🔥',
}

const DIFF_COLOR: Record<string, string> = {
  easy:   colors.easy,
  medium: colors.medium,
  hard:   colors.hard,
}

export default function CategoryMapScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>()
  const category = QUEST_CATEGORY_MAP.get(categoryId ?? '')
  const categoryProgress = useQuestStore(s => s.categoryProgress[categoryId ?? ''])
  const [loading, setLoading] = useState(false)

  const setCategory = useGameStore(s => s.setCategory)
  const setDifficulty = useGameStore(s => s.setDifficulty)
  const setIsDailyChallenge = useGameStore(s => s.setIsDailyChallenge)
  const setQuestNode = useGameStore(s => s.setQuestNode)
  const startRound = useGameStore(s => s.startRound)

  if (!category) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Text style={styles.errorText}>Category not found.</Text>
        </View>
      </ScreenWrapper>
    )
  }

  const progress = categoryProgress ?? {
    revealedNodeIds: [],
    completedNodeIds: [],
    bestStars: {},
    categoryXp: 0,
    highestClearedTier: 0,
  }

  const handlePlay = async (node: QuestNode) => {
    if (loading) return
    setLoading(true)
    try {
      const params = getCreateRoundParams(node)
      setCategory(params.category)
      setDifficulty(params.difficulty)
      setIsDailyChallenge(false)
      setQuestNode(node.id, node.categoryId, node.mode)

      const round = await roundsApi.create(params)
      const questionsData = await roundsApi.getQuestions(round.roundId)
      startRound(
        round.roundId,
        questionsData.questions,
        questionsData.livesRemaining,
        questionsData.streak,
        questionsData.currentPosition,
        questionsData.hammers,
        questionsData.xpEarnedInRound,
        questionsData.scoringTimerMode,
        questionsData.shields,
      )
      router.push('/game/play')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not start round. Please try again.'
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  const revealedIds = new Set(progress.revealedNodeIds)
  const completedIds = new Set(progress.completedNodeIds)
  const visibleNodes = category.nodes.filter(n => revealedIds.has(n.id) || completedIds.has(n.id))
  const lockedCount = category.nodes.length - visibleNodes.length

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>{category.emoji}</Text>
            <Text style={styles.title}>{category.name}</Text>
          </View>
          {progress.categoryXp > 0 && (
            <Text style={styles.categoryXp}>+{progress.categoryXp.toLocaleString()} XP earned</Text>
          )}
        </View>

        {/* Node list */}
        <View style={styles.nodeList}>
          {visibleNodes.map(node => {
            const status = getNodeStatus(progress, node.id)
            const isCompleted = status === 'completed'
            const bestStars = progress.bestStars[node.id] ?? 0
            const diffColor = DIFF_COLOR[node.difficulty] ?? colors.textSecondary

            return (
              <TouchableOpacity
                key={node.id}
                style={[
                  styles.nodeCard,
                  isCompleted && styles.nodeCardCompleted,
                  node.type === 'boss' && styles.nodeCardBoss,
                  { borderColor: isCompleted ? `${category.color}55` : node.type === 'boss' ? `${colors.hard}88` : colors.border },
                ]}
                onPress={() => handlePlay(node)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.nodeLeft}>
                  <Text style={styles.nodeModeEmoji}>{MODE_EMOJI[node.mode] ?? '📝'}</Text>
                  <View style={styles.nodeInfo}>
                    <Text style={[styles.nodeTitle, isCompleted && styles.nodeTitleCompleted]}>
                      {node.title}
                    </Text>
                    <View style={styles.nodeMeta}>
                      <Text style={[styles.nodeDiff, { color: diffColor }]}>
                        {node.difficulty.toUpperCase()}
                      </Text>
                      <Text style={styles.nodeSep}>·</Text>
                      <Text style={styles.nodeMode}>{MODE_LABELS[node.mode]}</Text>
                      <Text style={styles.nodeSep}>·</Text>
                      <Text style={[styles.nodeXp, { color: category.color }]}>+{node.rewardXp} XP</Text>
                    </View>
                    <Text style={styles.nodeDescription} numberOfLines={1}>{node.description}</Text>
                  </View>
                </View>
                <View style={styles.nodeRight}>
                  {isCompleted ? (
                    <Text style={styles.nodeStars}>
                      {'★'.repeat(bestStars)}{'☆'.repeat(3 - bestStars)}
                    </Text>
                  ) : loading ? (
                    <ActivityIndicator size="small" color={category.color} />
                  ) : (
                    <Text style={[styles.playBtn, { color: category.color }]}>Play →</Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}

          {/* Locked nodes hint */}
          {lockedCount > 0 && (
            <View style={styles.lockedHint}>
              <Text style={styles.lockedHintText}>
                {lockedCount} more node{lockedCount > 1 ? 's' : ''} to unlock
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textSecondary, fontSize: fontSize.md },

  header: { gap: spacing.sm },
  backBtn: { alignSelf: 'flex-start' },
  backText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 36 },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  categoryXp: { fontSize: fontSize.sm, color: colors.streakActive, fontWeight: '700' },

  nodeList: { gap: spacing.md },

  nodeCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nodeCardCompleted: {
    opacity: 0.75,
  },
  nodeCardBoss: {
    borderWidth: 2,
  },
  nodeLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nodeModeEmoji: { fontSize: 28 },
  nodeInfo: { flex: 1, gap: 3 },
  nodeTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  nodeTitleCompleted: { color: colors.textSecondary },
  nodeMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  nodeDiff: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 0.5 },
  nodeSep: { fontSize: fontSize.xs, color: colors.textMuted },
  nodeMode: { fontSize: fontSize.xs, color: colors.textSecondary },
  nodeXp: { fontSize: fontSize.xs, fontWeight: '700' },
  nodeDescription: { fontSize: fontSize.xs, color: colors.textMuted },

  nodeRight: { alignItems: 'center', minWidth: 56 },
  nodeStars: { fontSize: fontSize.md, color: colors.streakActive, letterSpacing: 1 },
  playBtn: { fontSize: fontSize.sm, fontWeight: '700' },

  lockedHint: {
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  lockedHintText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
})
