import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0'

interface RateLimitResult {
  allowed: boolean
  remaining: number
}

/**
 * Check how many rounds a user has created in the last `windowMinutes` minutes.
 * Uses the existing rounds table — no extra table needed.
 */
export async function checkRoundCreationLimit(
  supabase: SupabaseClient,
  userId: string,
  limitPerWindow = 60,
  windowMinutes = 60
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('rounds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart)

  if (error) {
    // Fail open: if we can't check, allow the request
    return { allowed: true, remaining: limitPerWindow }
  }

  const used = count ?? 0
  const remaining = Math.max(0, limitPerWindow - used)
  return { allowed: used < limitPerWindow, remaining }
}
