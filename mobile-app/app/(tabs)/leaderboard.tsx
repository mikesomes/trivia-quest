import React from 'react'
import {
  View, Text, StyleSheet,
  RefreshControl,
} from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { useLeaderboard } from '../../src/hooks/useLeaderboard'
import { useLeaderboardStore } from '../../src/store/leaderboardStore'
import type { GameModeTab } from '../../src/store/leaderboardStore'
import { useAuthStore } from '../../src/store/authStore'
import { TabSwitcher } from '../../src/components/leaderboard/TabSwitcher'
import { XpLeaderboardRow } from '../../src/components/leaderboard/XpLeaderboardRow'
import { GameModeLeaderboardRow } from '../../src/components/leaderboard/GameModeLeaderboardRow'
import { ResetCountdown } from '../../src/components/leaderboard/ResetCountdown'
import { MyRankBanner } from '../../src/components/leaderboard/MyRankBanner'
import { LeaderboardSkeletonList } from '../../src/components/leaderboard/LeaderboardRowSkeleton'
import type { LeaderboardMode, LeaderboardPeriod } from '../../src/types/api'
import { getXpGapToNextRank, getNextRankLabel } from '../../src/utils/leaderboard'

const MODE_TABS: Array<{ id: GameModeTab; label: string; icon: string }> = [
  { id: 'xp',       label: 'XP',       icon: '🏆' },
  { id: 'classic',  label: 'Classic',  icon: '🧠' },
  { id: 'survival', label: 'Survival', icon: '💀' },
  { id: 'blitz',    label: 'Blitz',    icon: '⚡' },
]

const XP_PERIOD_TABS: Array<{ id: LeaderboardPeriod; label: string }> = [
  { id: 'weekly',  label: 'Weekly' },
  { id: 'today',   label: 'Daily' },
  { id: 'alltime', label: 'All-Time' },
]

const GAME_PERIOD_TABS: Array<{ id: LeaderboardPeriod; label: string }> = [
  { id: 'weekly',  label: 'Weekly' },
  { id: 'alltime', label: 'All-Time' },
]

const XP_SUBTITLES: Record<LeaderboardPeriod, string> = {
  weekly:  'XP earned this week',
  today:   'XP earned today',
  alltime: 'Total XP (prestige)',
}

const MODE_SUBTITLES: Record<Exclude<GameModeTab, 'xp'>, string> = {
  classic:  'Best session · rounds reached',
  survival: 'Furthest run · questions answered',
  blitz:    'Best run · correct answers',
}

// What each mode's primaryValue actually measures — MyRankBanner used to
// hardcode "XP" for every mode, which was flat wrong for Blitz (correct
// answers) and Survival (questions answered).
const UNIT_LABELS: Record<GameModeTab, string> = {
  xp:       'XP',
  classic:  'XP',
  survival: 'questions',
  blitz:    'correct',
}

const API_MODE: Record<GameModeTab, LeaderboardMode> = {
  xp:       'xp',
  classic:  'classic',
  survival: 'survival',
  blitz:    'blitz',
}

export default function LeaderboardScreen() {
  const activeGameMode = useLeaderboardStore((s) => s.activeGameMode)
  const setGameMode    = useLeaderboardStore((s) => s.setGameMode)
  const activePeriod   = useLeaderboardStore((s) => s.activePeriod)
  const setPeriod      = useLeaderboardStore((s) => s.setPeriod)
  const userId         = useAuthStore((s) => s.userId)
  const displayName    = useAuthStore((s) => s.displayName)

  // Non-XP modes don't support 'today'
  const effectivePeriod: LeaderboardPeriod =
    activeGameMode !== 'xp' && activePeriod === 'today' ? 'weekly' : activePeriod

  const { data, isLoading, isError, refetch, isFetching } = useLeaderboard(
    API_MODE[activeGameMode],
    effectivePeriod,
  )

  const entries   = data?.entries ?? []
  const userEntry = data?.userEntry ?? null

  const currentUserEntry = activeGameMode === 'xp'
    ? entries.find((e) => e.userId === userId)
    : undefined
  const effectiveRank = currentUserEntry?.rank ?? userEntry?.rank
  const effectiveXp   = currentUserEntry?.primaryValue ?? userEntry?.primaryValue
  const xpGap = activeGameMode === 'xp' && effectiveRank != null && effectiveXp != null
    ? getXpGapToNextRank(effectiveRank, effectiveXp, entries)
    : null
  const nextLabel = activeGameMode === 'xp' && effectiveRank != null
    ? getNextRankLabel(effectiveRank, entries)
    : null

  const periodTabs = activeGameMode === 'xp' ? XP_PERIOD_TABS : GAME_PERIOD_TABS
  const subtitle = activeGameMode === 'xp'
    ? XP_SUBTITLES[effectivePeriod]
    : MODE_SUBTITLES[activeGameMode]

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        <Animated.FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          itemLayoutAnimation={LinearTransition}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Leaderboard</Text>

              <View style={styles.modeTabs}>
                {MODE_TABS.map((tab) => (
                  <AnimatedPressable
                    key={tab.id}
                    style={[styles.modeTab, activeGameMode === tab.id && styles.modeTabActive]}
                    onPress={() => {
                      setGameMode(tab.id)
                      if (tab.id !== 'xp' && activePeriod === 'today') setPeriod('weekly')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modeTabIcon}>{tab.icon}</Text>
                    <Text style={[styles.modeTabLabel, activeGameMode === tab.id && styles.modeTabLabelActive]}>
                      {tab.label}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>

              <TabSwitcher
                tabs={periodTabs}
                activeTab={effectivePeriod}
                onTabChange={setPeriod}
              />

              <View style={styles.metaRow}>
                <Text style={styles.subtitle}>{subtitle}</Text>
                <ResetCountdown period={effectivePeriod} />
              </View>

              {isLoading && <LeaderboardSkeletonList />}
              {isError && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>Failed to load leaderboard.</Text>
                  <Text style={styles.errorHint}>Pull down to retry.</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isCurrent = item.userId === userId
            if (activeGameMode === 'xp') {
              return (
                <XpLeaderboardRow
                  entry={item}
                  isCurrentUser={isCurrent}
                  xpGap={isCurrent ? xpGap : null}
                  nextRankName={isCurrent ? nextLabel : null}
                />
              )
            }
            return (
              <GameModeLeaderboardRow
                entry={item}
                isCurrentUser={isCurrent}
                mode={activeGameMode}
              />
            )
          }}
          ListEmptyComponent={
            !isLoading && !isError ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>
                  {MODE_TABS.find((t) => t.id === activeGameMode)?.icon ?? '🏆'}
                </Text>
                <Text style={styles.emptyTitle}>No players ranked yet</Text>
                <Text style={styles.emptyText}>
                  {effectivePeriod === 'alltime'
                    ? 'Complete a game to appear here.'
                    : 'Be the first to play this week!'}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={<View style={styles.footer} />}
          contentContainerStyle={styles.listContent}
        />

        <MyRankBanner
          userEntry={userEntry}
          displayName={displayName ?? 'You'}
          entries={entries}
          unitLabel={UNIT_LABELS[activeGameMode]}
        />
      </View>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    gap: 2,
  },
  modeTabActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}18`,
  },
  modeTabIcon: {
    fontSize: 18,
  },
  modeTabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeTabLabelActive: {
    color: colors.primaryLight,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  errorIcon: {
    fontSize: 32,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.incorrect,
    fontWeight: '700',
  },
  errorHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    height: spacing.xxl,
  },
})
