import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Coins, Minus, Plus } from 'phosphor-react-native'
import { ScreenWrapper } from '../../src/components/ui/ScreenWrapper'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
import { colors, spacing, fontSize, radius } from '../../src/constants/theme'
import { SHOP_ITEMS, INVENTORY_KEYS, EQUIPPED_KEYS, type ShopItemId } from '../../src/constants/shop'
import { shopApi } from '../../src/api/shop'
import { queryKeys } from '../../src/constants/queryKeys'
import { useProfile } from '../../src/hooks/useProfile'
import type { EquipItemsRequest } from '../../src/types/api'

export default function ShopScreen() {
  const { data: profile, isLoading } = useProfile()
  const queryClient = useQueryClient()

  // Local optimistic loadout state — synced from profile, adjusted locally on stepper taps
  const [loadout, setLoadout] = useState<EquipItemsRequest>({
    equipped_lives: 0,
    equipped_hammers: 0,
    equipped_shields: 0,
    equipped_xp_booster: 0,
  })

  useEffect(() => {
    if (profile) {
      setLoadout({
        equipped_lives:      profile.equipped_lives,
        equipped_hammers:    profile.equipped_hammers,
        equipped_shields:    profile.equipped_shields,
        equipped_xp_booster: profile.equipped_xp_booster,
      })
    }
  }, [profile])

  const purchaseMutation = useMutation({
    mutationFn: (req: { itemId: ShopItemId; quantity: number }) =>
      shopApi.purchase(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (err: Error) => {
      Alert.alert('Purchase failed', err.message || 'Could not complete purchase. Try again.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  })

  const equipMutation = useMutation({
    mutationFn: (req: EquipItemsRequest) => shopApi.equip(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all() })
    },
    onError: (err: Error) => {
      // Revert optimistic state on error
      if (profile) {
        setLoadout({
          equipped_lives:      profile.equipped_lives,
          equipped_hammers:    profile.equipped_hammers,
          equipped_shields:    profile.equipped_shields,
          equipped_xp_booster: profile.equipped_xp_booster,
        })
      }
      Alert.alert('Could not update loadout', err.message || 'Try again.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  })

  const handleBuy = (itemId: ShopItemId) => {
    if (!profile) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    purchaseMutation.mutate({ itemId, quantity: 1 })
  }

  const handleEquipChange = (itemId: ShopItemId, delta: number) => {
    if (!profile) return
    const equippedKey = EQUIPPED_KEYS[itemId] as keyof EquipItemsRequest | undefined
    if (!equippedKey) return
    const inventoryKey = INVENTORY_KEYS[itemId]
    const owned = (profile[inventoryKey] as number) ?? 0
    const current = loadout[equippedKey]
    const next = Math.max(0, Math.min(owned, current + delta))
    if (next === current) return

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newLoadout = { ...loadout, [equippedKey]: next }
    setLoadout(newLoadout)
    equipMutation.mutate(newLoadout)
  }

  const coins = profile?.coins ?? 0

  const loadoutItems = SHOP_ITEMS.filter((item) => {
    if (!item.equippable) return false
    const key = INVENTORY_KEYS[item.id]
    return (profile?.[key] as number ?? 0) > 0
  })

  const hasLoadout = loadoutItems.length > 0

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Shop</Text>
          <View style={styles.coinBadge}>
            <Coins weight="duotone" size={20} color="#FFD700" />
            <Text style={styles.coinBalance}>
              {isLoading ? '—' : coins.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Loadout */}
        {hasLoadout && (
          <>
            <Text style={styles.sectionLabel}>Loadout</Text>
            <View style={styles.loadoutCard}>
              <LinearGradient
                colors={[`${colors.primary}22`, `${colors.primary}08`]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <LinearGradient
                colors={[colors.primary, `${colors.primary}00`]}
                style={styles.topLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.loadoutHint}>Choose what to bring into your next round</Text>
              {loadoutItems.map((item) => {
                const inventoryKey = INVENTORY_KEYS[item.id]
                const equippedKey = EQUIPPED_KEYS[item.id] as keyof EquipItemsRequest
                const owned = (profile?.[inventoryKey] as number) ?? 0
                const equipped = loadout[equippedKey]
                return (
                  <View key={item.id} style={styles.loadoutRow}>
                    <Text style={styles.loadoutEmoji}>{item.emoji}</Text>
                    <View style={styles.loadoutInfo}>
                      <Text style={styles.loadoutLabel}>{item.label}</Text>
                      <Text style={styles.loadoutOwned}>×{owned} in bag</Text>
                    </View>
                    <View style={styles.stepper}>
                      <AnimatedPressable
                        style={[styles.stepBtn, equipped === 0 && styles.stepBtnDisabled]}
                        onPress={() => handleEquipChange(item.id, -1)}
                        disabled={equipped === 0 || equipMutation.isPending}
                        activeOpacity={0.7}
                      >
                        <Minus size={14} color={equipped === 0 ? colors.textSecondary : colors.textPrimary} weight="bold" />
                      </AnimatedPressable>
                      <Text style={[styles.stepCount, equipped > 0 && styles.stepCountActive]}>
                        {equipped}
                      </Text>
                      <AnimatedPressable
                        style={[styles.stepBtn, equipped >= owned && styles.stepBtnDisabled]}
                        onPress={() => handleEquipChange(item.id, 1)}
                        disabled={equipped >= owned || equipMutation.isPending}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={equipped >= owned ? colors.textSecondary : colors.textPrimary} weight="bold" />
                      </AnimatedPressable>
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Shop items */}
        <Text style={styles.sectionLabel}>Power-ups</Text>
        <View style={styles.itemList}>
          {SHOP_ITEMS.map((item) => {
            const inventoryKey = INVENTORY_KEYS[item.id]
            const owned = (profile?.[inventoryKey] as number) ?? 0
            const atCap = owned >= item.maxInventory
            const canAfford = coins >= item.cost
            const isDisabled = atCap || !canAfford || purchaseMutation.isPending || isLoading

            return (
              <View key={item.id} style={styles.itemCard}>
                <LinearGradient
                  colors={['#ffffff08', '#ffffff03']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />

                <View style={styles.itemLeft}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                  <View style={styles.itemText}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    {owned > 0 && (
                      <Text style={styles.itemOwned}>
                        {owned}/{item.maxInventory} in bag
                      </Text>
                    )}
                  </View>
                </View>

                <AnimatedPressable
                  style={[styles.buyButton, isDisabled && styles.buyButtonDisabled]}
                  onPress={() => handleBuy(item.id)}
                  disabled={isDisabled}
                  activeOpacity={0.8}
                >
                  {purchaseMutation.isPending && purchaseMutation.variables?.itemId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : atCap ? (
                    <Text style={[styles.buyButtonText, styles.buyButtonDisabledText]}>Full</Text>
                  ) : (
                    <>
                      <Coins weight="duotone" size={13} color={canAfford ? '#FFD700' : colors.textSecondary} />
                      <Text style={[styles.buyButtonText, !canAfford && styles.buyButtonDisabledText]}>
                        {item.cost.toLocaleString()}
                      </Text>
                    </>
                  )}
                </AnimatedPressable>
              </View>
            )
          })}
        </View>

        {/* Earn more hint */}
        <Text style={styles.hint}>
          Earn coins by playing — 1 XP = 1 coin
        </Text>
      </ScrollView>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textPrimary },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#ffffff12',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#FFD70033',
  },
  coinBalance: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: '#FFD700',
  },

  loadoutCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    padding: spacing.md,
    overflow: 'hidden',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  loadoutHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  loadoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadoutEmoji: { fontSize: 26 },
  loadoutInfo: { flex: 1, gap: 1 },
  loadoutLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  loadoutOwned: { fontSize: fontSize.xs, color: colors.textSecondary },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#ffffff0a',
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: '#ffffff18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: '#ffffff08',
  },
  stepCount: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textSecondary,
    minWidth: 20,
    textAlign: 'center',
  },
  stepCountActive: {
    color: colors.primary,
  },

  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: -spacing.xs,
  },
  itemList: { gap: spacing.sm },

  itemCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemEmoji: { fontSize: 34 },
  itemText: { flex: 1, gap: 2 },
  itemLabel: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  itemDescription: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 16 },
  itemOwned: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary, marginTop: 2 },

  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 80,
    justifyContent: 'center',
  },
  buyButtonDisabled: {
    backgroundColor: '#ffffff18',
  },
  buyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: '#fff',
  },
  buyButtonDisabledText: {
    color: colors.textSecondary,
  },

  hint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.6,
  },
})
