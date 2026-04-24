import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput, Modal, TouchableWithoutFeedback,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { useProfile, useUpdateDisplayName } from '../../src/hooks/useProfile'
import { useAchievements } from '../../src/hooks/useAchievements'
import { XpProgressBar } from '../../src/components/profile/XpProgressBar'
import { AchievementBadge } from '../../src/components/profile/AchievementBadge'
import { PlayerAvatar } from '../../src/components/profile/PlayerAvatar'
import { GradientCard } from '../../src/components/ui/GradientCard'
import { getAvatarStage } from '../../src/constants/quest'
import { MAX_PLAYER_LEVEL } from '../../src/utils/scoring'
import { formatNumber, formatAccuracy, formatDate } from '../../src/utils/format'
import type { Achievement } from '../../src/types/user'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_game',    name: 'First Game',       description: 'Play your first game',                    icon: '🎮', rarity: 'common'    },
  { id: 'games_10',      name: 'Getting Started',   description: 'Play 10 games',                           icon: '📈', rarity: 'common'    },
  { id: 'games_50',      name: 'Dedicated',         description: 'Play 50 games',                           icon: '🎯', rarity: 'rare'      },
  { id: 'games_100',     name: 'Centurion',         description: 'Play 100 games',                          icon: '💯', rarity: 'epic'      },
  { id: 'perfect_round', name: 'Perfect Round',     description: 'Answer all 10 questions correctly',       icon: '⭐', rarity: 'rare'      },
  { id: 'speed_demon',   name: 'Speed Demon',       description: 'Perfect round with avg under 8 seconds',  icon: '⚡', rarity: 'epic'      },
  { id: 'survivor',      name: 'Survivor',          description: 'Finish a round with only 1 life left',    icon: '❤️', rarity: 'rare'      },
  { id: 'streak_5',      name: 'On Fire',           description: 'Get a 5-answer streak',                   icon: '🔥', rarity: 'common'    },
  { id: 'streak_10',     name: 'Unstoppable',       description: 'Get a 10-answer streak',                  icon: '🚀', rarity: 'rare'      },
  { id: 'streak_15',     name: 'Legendary Streak',  description: 'Get a 15-answer streak',                  icon: '👑', rarity: 'legendary' },
  { id: 'high_scorer',   name: 'High XP',           description: 'Earn 500 XP in a single round',           icon: '🏅', rarity: 'common'    },
  { id: 'big_brain',     name: 'Big Brain',         description: 'Earn 1500 XP in a session',              icon: '🧠', rarity: 'legendary' },
]

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }

const NAME_RE = /^[a-zA-Z0-9_. -]+$/

export default function ProfileScreen() {
  const { data: profile, isLoading } = useProfile()
  const { data: earnedAchievements = [] } = useAchievements()
  const updateName = useUpdateDisplayName()

  const [achievementFilter, setAchievementFilter] = useState<'all' | 'earned'>('earned')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  const earnedIds = new Set(earnedAchievements.map(a => a.id))

  const sortedAchievements = [...ALL_ACHIEVEMENTS].sort((a, b) => {
    const aEarned = earnedIds.has(a.id) ? 0 : 1
    const bEarned = earnedIds.has(b.id) ? 0 : 1
    if (aEarned !== bEarned) return aEarned - bEarned
    return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
  })

  const filteredAchievements = achievementFilter === 'earned'
    ? sortedAchievements.filter(a => earnedIds.has(a.id))
    : sortedAchievements

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (trimmed.length < 2) { setNameError('At least 2 characters'); return }
    if (trimmed.length > 20) { setNameError('20 characters max'); return }
    if (!NAME_RE.test(trimmed)) { setNameError('Letters, numbers, spaces, _ . - only'); return }
    try {
      await updateName.mutateAsync(trimmed)
      setShowNameModal(false)
      setNameInput('')
      setNameError('')
    } catch {
      setNameError('Could not save. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <ScreenWrapper>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </ScreenWrapper>
    )
  }

  if (!profile) {
    return (
      <ScreenWrapper>
        <Text style={styles.error}>Failed to load profile</Text>
      </ScreenWrapper>
    )
  }

  const stage = getAvatarStage(profile.level)

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[`${stage.color}40`, `${stage.color}10`, 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <PlayerAvatar level={profile.level} size="lg" />
          <TouchableOpacity
            style={styles.nameRow}
            onPress={() => { setNameInput(profile.displayName); setShowNameModal(true) }}
            activeOpacity={0.7}
          >
            <Text style={styles.heroName}>{profile.displayName}</Text>
            <Text style={styles.editIcon}>✎</Text>
          </TouchableOpacity>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.stagePill, { backgroundColor: `${stage.color}22`, borderColor: `${stage.color}55` }]}>
              <Text style={styles.stageEmoji}>{stage.emoji}</Text>
              <Text style={[styles.stageTitle, { color: stage.color }]}>{stage.title}</Text>
            </View>
            <View style={[styles.levelPill, { backgroundColor: stage.color }]}>
              <Text style={styles.levelPillText}>Lv. {profile.level}</Text>
            </View>
          </View>
        </View>

        {/* ── XP Bar ── */}
        <GradientCard accentColor={stage.color} contentStyle={styles.xpCardContent}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLevelFrom}>Level {profile.level}</Text>
            <Text style={styles.xpAmount}>
              {profile.level >= MAX_PLAYER_LEVEL ? 'Master tier reached' : `${profile.xpToNextLevel} XP to go`}
            </Text>
            <Text style={styles.xpLevelTo}>
              {profile.level >= MAX_PLAYER_LEVEL ? 'Cap' : `Level ${profile.level + 1}`}
            </Text>
          </View>
          <XpProgressBar
            currentXp={profile.xp}
            level={profile.level}
            xpToNextLevel={profile.xpToNextLevel}
          />
          <Text style={styles.xpTotal}>{formatNumber(profile.xp)} total XP</Text>
        </GradientCard>

        {/* ── Stats ── */}
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <GradientCard accentColor={colors.primary} style={styles.statCard} contentStyle={styles.statContent}>
            <Text style={styles.statEmoji}>🎮</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{profile.totalGames}</Text>
            <Text style={styles.statLabel}>Games Played</Text>
          </GradientCard>
          <GradientCard accentColor={colors.streakActive} style={styles.statCard} contentStyle={styles.statContent}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={[styles.statValue, { color: colors.streakActive }]}>{formatNumber(profile.bestXp)}</Text>
            <Text style={styles.statLabel}>Best XP</Text>
          </GradientCard>
          <GradientCard accentColor={colors.correct} style={styles.statCard} contentStyle={styles.statContent}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={[styles.statValue, { color: colors.correct }]}>{profile.totalCorrect}</Text>
            <Text style={styles.statLabel}>Total Correct</Text>
          </GradientCard>
          <GradientCard accentColor={colors.medium} style={styles.statCard} contentStyle={styles.statContent}>
            <Text style={styles.statEmoji}>🎯</Text>
            <Text style={[styles.statValue, { color: colors.medium }]}>{formatAccuracy(profile.accuracy)}</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </GradientCard>
        </View>

        {/* ── Achievements ── */}
        <View style={styles.achievementHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.filterRow}>
            {(['earned', 'all'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, achievementFilter === f && styles.filterTabActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAchievementFilter(f) }}
              >
                <Text style={[styles.filterTabText, achievementFilter === f && styles.filterTabTextActive]}>
                  {f === 'earned' ? `Earned (${earnedAchievements.length})` : `All (${ALL_ACHIEVEMENTS.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredAchievements.length === 0 ? (
          <View style={styles.emptyAchievements}>
            <Text style={styles.emptyEmoji}>🏅</Text>
            <Text style={styles.emptyText}>No achievements yet — play more games!</Text>
          </View>
        ) : (
          <View style={styles.achievementsGrid}>
            {filteredAchievements.map(a => (
              <AchievementBadge key={a.id} achievement={a} earned={earnedIds.has(a.id)} />
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Member since {formatDate(profile.createdAt)}</Text>
          <Text style={styles.footerText}>Trivia Quest · v1.0</Text>
        </View>
      </ScrollView>

      {/* ── Change Name Modal ── */}
      <Modal transparent animationType="fade" visible={showNameModal} onRequestClose={() => setShowNameModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowNameModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Change Display Name</Text>
                <TextInput
                  style={[styles.nameInput, nameError ? styles.nameInputError : null]}
                  value={nameInput}
                  onChangeText={t => { setNameInput(t); setNameError('') }}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  maxLength={20}
                  autoFocus
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <Text style={styles.charCount}>{nameInput.trim().length}/20</Text>
                {nameError ? <Text style={styles.nameError}>{nameError}</Text> : null}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowNameModal(false); setNameError('') }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, updateName.isPending && styles.saveBtnDisabled]}
                    onPress={handleSaveName}
                    disabled={updateName.isPending}
                  >
                    {updateName.isPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveBtnText}>Save</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing.xxl, gap: spacing.lg },
  error: { color: colors.incorrect, textAlign: 'center', flex: 1, marginTop: spacing.xl },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroName: { fontSize: fontSize.xxl, fontWeight: '900', color: colors.textPrimary },
  editIcon: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  stageEmoji: { fontSize: 14 },
  stageTitle: { fontSize: fontSize.sm, fontWeight: '700' },
  levelPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  levelPillText: { fontSize: fontSize.sm, fontWeight: '800', color: '#fff' },

  // XP
  xpCardContent: { padding: spacing.lg, gap: spacing.sm },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLevelFrom: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textPrimary },
  xpLevelTo: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textSecondary },
  xpAmount: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },
  xpTotal: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },

  // Stats
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statCard: { width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2 },
  statContent: { padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  statEmoji: { fontSize: 28 },
  statValue: { fontSize: fontSize.xxl, fontWeight: '900' },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Achievements
  achievementHeader: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary },
  filterTabTextActive: { color: '#fff' },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyAchievements: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },

  // Footer
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  footerText: { fontSize: fontSize.xs, color: colors.textMuted },

  // Name modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  nameInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  nameInputError: { borderColor: colors.incorrect },
  charCount: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
  nameError: { fontSize: fontSize.sm, color: colors.incorrect, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: fontSize.md, color: '#fff', fontWeight: '700' },
})
