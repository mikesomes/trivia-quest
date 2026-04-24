import React from 'react'
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { colors, spacing, fontSize } from '../../src/constants/theme'
import { useLeaderboard } from '../../src/hooks/useLeaderboard'
import { useLeaderboardStore } from '../../src/store/leaderboardStore'
import { useAuthStore } from '../../src/store/authStore'
import { TabSwitcher } from '../../src/components/leaderboard/TabSwitcher'
import { XpLeaderboardRow } from '../../src/components/leaderboard/XpLeaderboardRow'
import { ResetCountdown } from '../../src/components/leaderboard/ResetCountdown'
import { MyRankBanner } from '../../src/components/leaderboard/MyRankBanner'
import type { LeaderboardPeriod } from '../../src/types/api'
import { getXpGapToNextRank, getNextRankLabel } from '../../src/utils/leaderboard'

const PERIOD_TABS: Array<{ id: LeaderboardPeriod; label: string }> = [
  { id: 'weekly',  label: 'Weekly' },
  { id: 'today',   label: 'Daily' },
  { id: 'alltime', label: 'All-Time' },
]

const PERIOD_SUBTITLES: Record<LeaderboardPeriod, string> = {
  weekly:  'XP earned this week',
  today:   'XP earned today',
  alltime: 'Total XP (prestige)',
}

export default function LeaderboardScreen() {
  const activePeriod = useLeaderboardStore((s) => s.activePeriod)
  const setPeriod    = useLeaderboardStore((s) => s.setPeriod)
  const userId      = useAuthStore((s) => s.userId)
  const displayName = useAuthStore((s) => s.displayName)

  const { data, isLoading, isError, refetch, isFetching } = useLeaderboard(
    'xp',
    activePeriod,
  )

  const entries    = data?.entries ?? []
  const userEntry  = data?.userEntry ?? null

  const currentUserEntry = entries.find((e) => e.userId === userId)
  const effectiveRank    = currentUserEntry?.rank ?? userEntry?.rank
  const effectiveXp      = currentUserEntry?.primaryValue ?? userEntry?.primaryValue

  const xpGap      = effectiveRank != null && effectiveXp != null
    ? getXpGapToNextRank(effectiveRank, effectiveXp, entries)
    : null
  const nextLabel  = effectiveRank != null
    ? getNextRankLabel(effectiveRank, entries)
    : null

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
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

              <TabSwitcher
                tabs={PERIOD_TABS}
                activeTab={activePeriod}
                onTabChange={setPeriod}
              />

              <View style={styles.metaRow}>
                <Text style={styles.subtitle}>{PERIOD_SUBTITLES[activePeriod]}</Text>
                <ResetCountdown period={activePeriod} />
              </View>

              {isLoading && (
                <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
              )}
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
            return (
              <XpLeaderboardRow
                entry={item}
                isCurrentUser={isCurrent}
                xpGap={isCurrent ? xpGap : null}
                nextRankName={isCurrent ? nextLabel : null}
              />
            )
          }}
          ListEmptyComponent={
            !isLoading && !isError ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>
                  {activePeriod === 'weekly' ? '📅' : activePeriod === 'today' ? '⚡' : '🏆'}
                </Text>
                <Text style={styles.emptyTitle}>No players ranked yet</Text>
                <Text style={styles.emptyText}>
                  {activePeriod === 'alltime'
                    ? 'Complete a round to appear here.'
                    : 'Be the first to earn XP and claim the top spot!'}
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
  loader: {
    marginVertical: spacing.xxl,
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
