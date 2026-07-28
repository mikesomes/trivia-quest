import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TextInput, Modal, TouchableWithoutFeedback,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { haptics } from '../../src/lib/haptics'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
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
import { tabularNums } from '../../src/components/ui/Typography'
import { GameIcon } from '../../src/components/icons'
import { MedalIcon } from '../../src/components/icons'
const { width: SCREEN_WIDTH } = Dimensions.get('window')

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }

const NAME_RE = /^[a-zA-Z0-9_. -]+$/

export default function ProfileScreen() {
  const { data: profile, isLoading } = useProfile()
  const { data: achievements = [] } = useAchievements()
  const updateName = useUpdateDisplayName()

  const [achievementFilter, setAchievementFilter] = useState<'all' | 'earned'>('earned')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  const earnedCount = achievements.filter(a => a.earned).length

  const sortedAchievements = [...achievements].sort((a, b) => {
    const aEarned = a.earned ? 0 : 1
    const bEarned = b.earned ? 0 : 1
    if (aEarned !== bEarned) return aEarned - bEarned
    return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
  })

  const filteredAchievements = achievementFilter === 'earned'
    ? sortedAchievements.filter(a => a.earned)
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
          <AnimatedPressable
            style={styles.nameRow}
            onPress={() => { setNameInput(profile.displayName); setShowNameModal(true) }}
            activeOpacity={0.7}
          >
            <Text style={styles.heroName}>{profile.displayName}</Text>
            <GameIcon name="edit" size={14} />
          </AnimatedPressable>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.stagePill, { backgroundColor: `${stage.color}22`, borderColor: `${stage.color}55` }]}>
              <GameIcon name={stage.icon} size={15} color={stage.color} />
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
            <GameIcon name="games" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.primary }]}>{profile.totalGames}</Text>
            <Text style={styles.statLabel}>Games Played</Text>
          </GradientCard>
          <GradientCard accentColor={colors.streakActive} style={styles.statCard} contentStyle={styles.statContent}>
            <GameIcon name="trophy" size={24} color={colors.streakActive} />
            <Text style={[styles.statValue, { color: colors.streakActive }]}>{formatNumber(profile.bestXp)}</Text>
            <Text style={styles.statLabel}>Best XP</Text>
          </GradientCard>
          <GradientCard accentColor={colors.correct} style={styles.statCard} contentStyle={styles.statContent}>
            <GameIcon name="correct" size={24} color={colors.correct} />
            <Text style={[styles.statValue, { color: colors.correct }]}>{profile.totalCorrect}</Text>
            <Text style={styles.statLabel}>Total Correct</Text>
          </GradientCard>
          <GradientCard accentColor={colors.medium} style={styles.statCard} contentStyle={styles.statContent}>
            <GameIcon name="target" size={24} color={colors.medium} />
            <Text style={[styles.statValue, { color: colors.medium }]}>{formatAccuracy(profile.accuracy)}</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </GradientCard>
          <GradientCard accentColor={colors.streakActive} style={styles.statCard} contentStyle={styles.statContent}>
            <GameIcon name="flame" size={24} color={colors.streakActive} />
            <Text style={[styles.statValue, { color: colors.streakActive }]}>{profile.dayStreak ?? 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </GradientCard>
          <GradientCard accentColor={colors.incorrect} style={styles.statCard} contentStyle={styles.statContent}>
            <GameIcon name="trendUp" size={24} color={colors.incorrect} />
            <Text style={[styles.statValue, { color: colors.incorrect }]}>{profile.longestDayStreak ?? 0}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </GradientCard>
        </View>

        {/* ── Achievements ── */}
        <View style={styles.achievementHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.filterRow}>
            {(['earned', 'all'] as const).map(f => (
              <AnimatedPressable
                key={f}
                style={[styles.filterTab, achievementFilter === f && styles.filterTabActive]}
                onPress={() => { haptics.selection(); setAchievementFilter(f) }}
              >
                <Text style={[styles.filterTabText, achievementFilter === f && styles.filterTabTextActive]}>
                  {f === 'earned' ? `Earned (${earnedCount})` : `All (${achievements.length})`}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {filteredAchievements.length === 0 ? (
          <View style={styles.emptyAchievements}>
            <MedalIcon size={34} />
            <Text style={styles.emptyText}>No achievements yet — play more games!</Text>
          </View>
        ) : (
          <View style={styles.achievementsGrid}>
            {filteredAchievements.map(a => (
              <AchievementBadge key={a.id} achievement={a} />
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
                  <AnimatedPressable style={styles.cancelBtn} onPress={() => { setShowNameModal(false); setNameError('') }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[styles.saveBtn, updateName.isPending && styles.saveBtnDisabled]}
                    onPress={handleSaveName}
                    disabled={updateName.isPending}
                  >
                    {updateName.isPending
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveBtnText}>Save</Text>
                    }
                  </AnimatedPressable>
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
  stageTitle: { fontSize: fontSize.sm, fontWeight: '700' },
  levelPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  levelPillText: { ...tabularNums, fontSize: fontSize.sm, fontWeight: '800', color: colors.textOnAccent },

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
  statValue: { ...tabularNums, fontSize: fontSize.xxl, fontWeight: '900' },
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
  filterTabTextActive: { color: colors.textOnAccent },
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
  saveBtnText: { fontSize: fontSize.md, color: colors.textOnAccent, fontWeight: '700' },
})
