import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { levelFromXp, xpToNextLevel } from '../_shared/scoring.ts'

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', auth.userId)
    .single()

  if (error || !user) return errorResponse('User not found', 404)

  const currentLevel = levelFromXp(user.xp)
  const accuracy = user.total_games > 0
    ? Math.round((user.total_correct / (user.total_games * 10)) * 1000) / 1000
    : 0

  return jsonResponse({
    id: user.id,
    displayName: user.display_name,
    isAnonymous: user.is_anonymous,
    level: currentLevel,
    xp: user.xp,
    xpToNextLevel: xpToNextLevel(user.xp),
    totalGames: user.total_games,
    totalCorrect: user.total_correct,
    bestXp: user.best_score,
    accuracy,
    createdAt: user.created_at,
    coins: user.coins ?? 0,
    inventory_lives: user.inventory_lives ?? 0,
    inventory_hammers: user.inventory_hammers ?? 0,
    inventory_shields: user.inventory_shields ?? 0,
    inventory_xp_booster: user.inventory_xp_booster ?? 0,
    equipped_lives: user.equipped_lives ?? 0,
    equipped_hammers: user.equipped_hammers ?? 0,
    equipped_shields: user.equipped_shields ?? 0,
    equipped_xp_booster: user.equipped_xp_booster ?? 0,
    dayStreak: user.current_streak ?? 0,
    longestDayStreak: user.longest_streak ?? 0,
    streakFreezes: user.streak_freezes ?? 0,
    lastActiveDate: user.last_active_date ?? null,
  })
})
