import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import {
  GAMES_TARGETS,
  SURVIVAL_TARGETS,
  BLITZ_TARGETS,
  DAY_STREAK_TARGETS,
  CHEST_STREAK_TARGETS,
  CATEGORY_MASTERY_TARGET,
} from '../_shared/achievements.ts'

// Returns the full achievement catalogue with earned status, and — for
// achievements backed by a running counter — progress toward the next tier.
// Achievements that are per-round pass/fail conditions (perfect_round,
// speed_demon, survivor, streak_5/10/15, high_scorer, big_brain, first_game)
// have no natural "progress" number and are omitted from the progress map.

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()

  const [catalogueRes, earnedRes, userRes, categoryRes] = await Promise.all([
    supabase.from('achievements').select('id, name, description, icon, rarity'),
    supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', auth.userId),
    supabase
      .from('users')
      .select('total_games, current_streak, chest_streak, best_survival_depth, best_blitz_correct')
      .eq('id', auth.userId)
      .single(),
    supabase.from('user_category_stats').select('category, correct_count').eq('user_id', auth.userId),
  ])

  if (catalogueRes.error) return errorResponse('Failed to load achievements', 500)

  const earnedMap = new Map((earnedRes.data ?? []).map(r => [r.achievement_id, r.earned_at]))
  const user = userRes.data
  const categoryCorrect = Object.fromEntries((categoryRes.data ?? []).map(r => [r.category, r.correct_count]))

  function progressFor(id: string): { current: number; target: number } | null {
    for (const target of GAMES_TARGETS) {
      if (id === `games_${target}`) return { current: user?.total_games ?? 0, target }
    }
    for (const target of SURVIVAL_TARGETS) {
      if (id === `survival_${target}`) return { current: user?.best_survival_depth ?? 0, target }
    }
    for (const target of BLITZ_TARGETS) {
      if (id === `blitz_${target}`) return { current: user?.best_blitz_correct ?? 0, target }
    }
    for (const target of DAY_STREAK_TARGETS) {
      if (id === `day_streak_${target}`) return { current: user?.current_streak ?? 0, target }
    }
    for (const target of CHEST_STREAK_TARGETS) {
      if (id === `chest_streak_${target}`) return { current: user?.chest_streak ?? 0, target }
    }
    if (id.startsWith('category_master_')) {
      const category = id.replace('category_master_', '')
      return { current: categoryCorrect[category] ?? 0, target: CATEGORY_MASTERY_TARGET }
    }
    return null
  }

  const achievements = (catalogueRes.data ?? []).map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    rarity: a.rarity,
    earned: earnedMap.has(a.id),
    earnedAt: earnedMap.get(a.id) ?? null,
    progress: progressFor(a.id),
  }))

  return jsonResponse({ achievements })
})
