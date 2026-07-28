import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { getEasternDate } from '../_shared/streaks.ts'
import { computeStreakUpdate } from '../_shared/streakLogic.ts'
import { tierForStreak } from '../_shared/chest.ts'

// Returns today's daily chest status without claiming it — lets the client
// show tier + streak before the player taps to open.
//
// If already claimed today: { alreadyClaimed: true, tier, reward, chestStreak, longestChestStreak, claimDate }
// If not yet claimed:       { alreadyClaimed: false, tier (preview), chestStreak (preview), longestChestStreak, claimDate }

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()
  const today = getEasternDate()

  const { data: user, error } = await supabase
    .from('users')
    .select('chest_streak, longest_chest_streak, last_chest_claim_date')
    .eq('id', auth.userId)
    .single()

  if (error || !user) return errorResponse('User not found', 404)

  const { data: existingClaim } = await supabase
    .from('daily_reward_claims')
    .select('tier, reward_type, reward_amount')
    .eq('user_id', auth.userId)
    .eq('claim_date', today)
    .maybeSingle()

  if (existingClaim) {
    return jsonResponse({
      alreadyClaimed: true,
      tier: existingClaim.tier,
      reward: { type: existingClaim.reward_type, amount: existingClaim.reward_amount },
      chestStreak: user.chest_streak ?? 0,
      longestChestStreak: user.longest_chest_streak ?? 0,
      claimDate: today,
    })
  }

  // Preview the tier that claiming *today* would land on, without persisting anything.
  const preview = computeStreakUpdate(
    {
      currentStreak: user.chest_streak ?? 0,
      longestStreak: user.longest_chest_streak ?? 0,
      streakFreezes: 0,
      lastActiveDate: user.last_chest_claim_date,
    },
    today,
  )

  return jsonResponse({
    alreadyClaimed: false,
    tier: tierForStreak(preview.currentStreak),
    chestStreak: preview.currentStreak,
    longestChestStreak: preview.longestStreak,
    claimDate: today,
  })
})
