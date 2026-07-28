import type { createServiceClient } from './supabaseClient.ts'

export * from './achievementLogic.ts'

export interface AchievementRecord {
  id: string
  name: string
  description: string
  icon: string
  rarity: string
}

/**
 * Diffs `conditions` against what's already earned, awards new ones, and
 * returns full records for anything newly earned (for client-side toasts).
 */
export async function checkAndAwardAchievements(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  conditions: Record<string, boolean>,
): Promise<AchievementRecord[]> {
  const eligible = Object.entries(conditions).filter(([, met]) => met).map(([id]) => id)
  if (eligible.length === 0) return []

  const { data: alreadyEarned } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)

  const earnedSet = new Set((alreadyEarned ?? []).map(r => r.achievement_id))
  const toAward = eligible.filter(id => !earnedSet.has(id))
  if (toAward.length === 0) return []

  await supabase.from('user_achievements').insert(
    toAward.map(achievement_id => ({ user_id: userId, achievement_id }))
  )

  const { data: awarded } = await supabase
    .from('achievements')
    .select('id, name, description, icon, rarity')
    .in('id', toAward)

  return (awarded ?? []) as AchievementRecord[]
}

/**
 * Fire-and-forget: bump a user's correct-answer count for a category.
 * Called from submit-answer, which every mode's per-question flow goes
 * through, so this stays accurate regardless of which mode is played.
 */
export async function incrementCategoryStat(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  category: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('user_category_stats')
    .select('correct_count')
    .eq('user_id', userId)
    .eq('category', category)
    .maybeSingle()

  await supabase
    .from('user_category_stats')
    .upsert(
      { user_id: userId, category, correct_count: (existing?.correct_count ?? 0) + 1 },
      { onConflict: 'user_id,category' },
    )
}
