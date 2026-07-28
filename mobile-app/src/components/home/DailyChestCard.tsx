import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import { haptics } from '../../lib/haptics'
import { Gift } from 'phosphor-react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { useDailyRewardStatus, useClaimDailyReward } from '../../hooks/useDailyReward'
import { useEasternMidnightCountdown } from '../../hooks/useEasternMidnightCountdown'
import { CHEST_TIER_META, CHEST_REWARD_META } from '../../constants/chest'
import { GradientCard } from '../ui/GradientCard'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { ChestOpenModal } from './ChestOpenModal'
import type { ChestReward, ChestTier } from '../../api/dailyReward'
import { tabularNums } from '../ui/Typography'
import { GameIcon } from '../icons'

export function DailyChestCard() {
  const { data: status, isLoading } = useDailyRewardStatus()
  const claimReward = useClaimDailyReward()
  const timeLeft = useEasternMidnightCountdown()
  const wiggle = useRef(new Animated.Value(0)).current

  const [modalTier, setModalTier] = useState<ChestTier>('wood')
  const [modalReward, setModalReward] = useState<ChestReward | null>(null)
  const [showModal, setShowModal] = useState(false)

  const claimable = !!status && !status.alreadyClaimed

  // Gentle recurring wiggle invites the tap while the chest is unclaimed.
  useEffect(() => {
    if (!claimable) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(wiggle, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 80, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [claimable])

  if (isLoading || !status) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    )
  }

  const tierMeta = CHEST_TIER_META[status.tier]

  const handleOpen = () => {
    if (claimReward.isPending) return
    haptics.punch()
    claimReward.mutate(undefined, {
      onSuccess: (result) => {
        setModalTier(result.tier)
        setModalReward(result.reward)
        setShowModal(true)
      },
    })
  }

  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] })

  return (
    <>
      <GradientCard
        accentColor={tierMeta.color}
        style={{ ...styles.card, borderColor: `${tierMeta.color}44` }}
        contentStyle={styles.cardContent}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: `${tierMeta.color}22`, borderColor: `${tierMeta.color}44` }]}>
              <Gift weight="duotone" size={22} color={tierMeta.color} />
            </View>
            <View>
              <Text style={styles.title}>Daily Chest</Text>
              <Text style={styles.subtitle}>{tierMeta.label} · {status.chestStreak}-day streak</Text>
            </View>
          </View>
        </View>

        {status.alreadyClaimed ? (
          <View style={styles.claimedBody}>
            {status.reward && (
              <View style={styles.claimedRow}>
                <GameIcon name={CHEST_REWARD_META[status.reward.type].icon} size={20} />
                <Text style={styles.claimedText}>
                  {CHEST_REWARD_META[status.reward.type].label(status.reward.amount)}
                </Text>
              </View>
            )}
            <View style={styles.nextRow}>
              <Text style={styles.nextLabel}>Next chest in</Text>
              <Text style={styles.countdown}>{timeLeft}</Text>
            </View>
          </View>
        ) : (
          <AnimatedPressable
            onPress={handleOpen}
            disabled={claimReward.isPending}
            activeOpacity={0.85}
            style={styles.openRow}
          >
            <Animated.View style={{ transform: [{ rotate }] }}>
              <GameIcon name={tierMeta.icon} size={34} color={tierMeta.color} />
            </Animated.View>
            <View style={styles.openTextCol}>
              <Text style={styles.openTitle}>
                {claimReward.isPending ? 'Opening…' : 'Tap to open'}
              </Text>
              <Text style={styles.openHint}>Free once a day</Text>
            </View>
          </AnimatedPressable>
        )}
      </GradientCard>

      <ChestOpenModal
        visible={showModal}
        tier={modalTier}
        reward={modalReward}
        onDismiss={() => setShowModal(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  card: {},
  cardContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  openTextCol: { flex: 1, gap: 2 },
  openTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  openHint: { fontSize: fontSize.xs, color: colors.textSecondary },
  claimedBody: { gap: spacing.sm },
  claimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  claimedText: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${colors.border}88`,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  nextLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  countdown: { ...tabularNums, fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
})
