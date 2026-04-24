export type ChallengePeriod = 'daily' | 'weekly'
export type ChallengeType = 'correct_answers' | 'rounds_completed'

export interface ChallengeDef {
  id: string
  period: ChallengePeriod
  type: ChallengeType
  target: number
  xpReward: number
  label: string
  emoji: string
}

export const CHALLENGE_DEFS: ChallengeDef[] = [
  { id: 'daily_correct_25',   period: 'daily',  type: 'correct_answers',  target: 25,  xpReward: 200,  label: 'Answer 25 questions correctly', emoji: '🎯' },
  { id: 'daily_rounds_3',     period: 'daily',  type: 'rounds_completed', target: 3,   xpReward: 300,  label: 'Complete 3 rounds',             emoji: '🏆' },
  { id: 'weekly_correct_100', period: 'weekly', type: 'correct_answers',  target: 100, xpReward: 750,  label: 'Answer 100 questions correctly', emoji: '⭐' },
  { id: 'weekly_rounds_10',   period: 'weekly', type: 'rounds_completed', target: 10,  xpReward: 1000, label: 'Complete 10 rounds',             emoji: '🔥' },
]

export function getPeriodStart(period: ChallengePeriod): string {
  const now = new Date()
  if (period === 'daily') {
    // Use Eastern date so daily challenges reset at midnight America/New_York (DST-safe).
    return now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  }
  // Weekly: Monday of current UTC week
  const day = now.getUTCDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  return monday.toISOString().split('T')[0]
}

/**
 * Increment progress for all challenges of a given type, award XP on completion.
 * Fire-and-forget safe — errors are logged but not thrown.
 */
export async function incrementChallengeProgress(
  supabase: ReturnType<typeof import('./supabaseClient.ts').createServiceClient>,
  userId: string,
  type: ChallengeType,
  amount = 1
): Promise<void> {
  const relevant = CHALLENGE_DEFS.filter(c => c.type === type)

  for (const def of relevant) {
    const periodStart = getPeriodStart(def.period)

    // Upsert progress row
    const { data, error } = await supabase
      .from('user_challenge_progress')
      .upsert(
        { user_id: userId, challenge_id: def.id, period_start: periodStart, progress: amount },
        { onConflict: 'user_id,challenge_id,period_start', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (error || !data) {
      // Row exists — increment instead
      const { data: existing } = await supabase
        .from('user_challenge_progress')
        .select('progress, is_complete, xp_awarded')
        .eq('user_id', userId)
        .eq('challenge_id', def.id)
        .eq('period_start', periodStart)
        .single()

      if (!existing) continue

      const newProgress = existing.progress + amount
      const justCompleted = !existing.is_complete && newProgress >= def.target

      await supabase
        .from('user_challenge_progress')
        .update({
          progress: newProgress,
          is_complete: existing.is_complete || justCompleted,
          completed_at: justCompleted ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('challenge_id', def.id)
        .eq('period_start', periodStart)

      // Award XP on first completion
      if (justCompleted && !existing.xp_awarded) {
        await supabase.rpc('award_challenge_xp', { p_user_id: userId, p_xp: def.xpReward })
        await supabase
          .from('user_challenge_progress')
          .update({ xp_awarded: true })
          .eq('user_id', userId)
          .eq('challenge_id', def.id)
          .eq('period_start', periodStart)
      }
    } else {
      // Freshly inserted — check if already complete (target = 1)
      if (data.progress >= def.target && !data.is_complete) {
        await supabase
          .from('user_challenge_progress')
          .update({ is_complete: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', data.id)

        await supabase.rpc('award_challenge_xp', { p_user_id: userId, p_xp: def.xpReward })
        await supabase
          .from('user_challenge_progress')
          .update({ xp_awarded: true })
          .eq('id', data.id)
      }
    }
  }
}
