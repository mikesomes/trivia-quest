import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { getEasternDate } from '../_shared/streaks.ts'
import { computeStreakUpdate } from '../_shared/streakLogic.ts'
import { tierForStreak, rollChestReward } from '../_shared/chest.ts'
import { checkAndAwardAchievements, thresholdConditions, CHEST_STREAK_TARGETS } from '../_shared/achievements.ts'

// Claims today's daily chest. Idempotent per Eastern calendar day — calling
// again (or racing a concurrent call) returns the already-recorded result
// rather than granting a second reward.
//
// POST (no body) → { alreadyClaimed, tier, reward: { type, amount }, chestStreak, longestChestStreak, newCoins }

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()
  const today = getEasternDate()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('coins, chest_streak, longest_chest_streak, last_chest_claim_date, inventory_lives, inventory_hammers, inventory_shields, inventory_xp_booster')
    .eq('id', auth.userId)
    .single()

  if (userError || !user) return errorResponse('User not found', 404)

  const streakUpdate = computeStreakUpdate(
    {
      currentStreak: user.chest_streak ?? 0,
      longestStreak: user.longest_chest_streak ?? 0,
      streakFreezes: 0,
      lastActiveDate: user.last_chest_claim_date,
    },
    today,
  )

  const tier = tierForStreak(streakUpdate.currentStreak)
  const reward = rollChestReward(tier, {
    inventory_lives: user.inventory_lives ?? 0,
    inventory_hammers: user.inventory_hammers ?? 0,
    inventory_shields: user.inventory_shields ?? 0,
    inventory_xp_booster: user.inventory_xp_booster ?? 0,
  })

  // Insert first: the UNIQUE(user_id, claim_date) constraint is the real
  // idempotency guard. Only a request that wins this insert grants a reward,
  // so a concurrent duplicate call can never double-grant.
  const { error: insertError } = await supabase
    .from('daily_reward_claims')
    .insert({
      user_id: auth.userId,
      claim_date: today,
      tier,
      reward_type: reward.rewardType,
      reward_amount: reward.amount,
    })

  if (insertError) {
    if (insertError.code !== '23505') return errorResponse('Failed to record claim', 500)

    // Already claimed (race or duplicate call) — return the stored result.
    const [{ data: existing }, { data: freshUser }] = await Promise.all([
      supabase
        .from('daily_reward_claims')
        .select('tier, reward_type, reward_amount')
        .eq('user_id', auth.userId)
        .eq('claim_date', today)
        .maybeSingle(),
      supabase
        .from('users')
        .select('coins, chest_streak, longest_chest_streak')
        .eq('id', auth.userId)
        .single(),
    ])

    const raceNewAchievements = await checkAndAwardAchievements(
      supabase,
      auth.userId,
      thresholdConditions('chest_streak', CHEST_STREAK_TARGETS, freshUser?.chest_streak ?? 0),
    )

    return jsonResponse({
      alreadyClaimed: true,
      tier: existing?.tier ?? tier,
      reward: existing ? { type: existing.reward_type, amount: existing.reward_amount } : null,
      chestStreak: freshUser?.chest_streak ?? 0,
      longestChestStreak: freshUser?.longest_chest_streak ?? 0,
      newCoins: freshUser?.coins ?? 0,
      newAchievements: raceNewAchievements,
    })
  }

  // Claim slot won — grant the reward.
  const coinsGained = reward.rewardType === 'coins' || reward.rewardType === 'jackpot' ? reward.amount : 0
  const newCoins = (user.coins ?? 0) + coinsGained

  const userUpdate: Record<string, unknown> = {
    coins: newCoins,
    chest_streak: streakUpdate.currentStreak,
    longest_chest_streak: streakUpdate.longestStreak,
    last_chest_claim_date: today,
  }
  if (reward.inventoryKey) {
    const current = (user as Record<string, unknown>)[reward.inventoryKey] as number ?? 0
    userUpdate[reward.inventoryKey] = current + reward.amount
  }

  const { error: updateError } = await supabase.from('users').update(userUpdate).eq('id', auth.userId)
  if (updateError) return errorResponse('Failed to grant reward', 500)

  const newAchievements = await checkAndAwardAchievements(
    supabase,
    auth.userId,
    thresholdConditions('chest_streak', CHEST_STREAK_TARGETS, streakUpdate.currentStreak),
  )

  return jsonResponse({
    alreadyClaimed: false,
    tier,
    reward: { type: reward.rewardType, amount: reward.amount },
    chestStreak: streakUpdate.currentStreak,
    longestChestStreak: streakUpdate.longestStreak,
    newCoins,
    newAchievements,
  })
})
