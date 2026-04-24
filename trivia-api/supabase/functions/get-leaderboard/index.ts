import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { CATEGORIES, type Category } from '../_shared/types.ts'

type Period = 'today' | 'weekly' | 'alltime'
type Mode = 'global' | 'category' | 'classic' | 'survival' | 'daily'

const PAGE_CAP = 100

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const url = new URL(req.url)
  const mode   = (url.searchParams.get('mode')   || 'global') as Mode
  const period = (url.searchParams.get('period') || 'alltime') as Period
  const limit  = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), PAGE_CAP)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const category = url.searchParams.get('category') as Category | null

  if (!['global', 'category', 'classic', 'survival', 'daily', 'xp'].includes(mode)) {
    return errorResponse('Invalid mode. Use global, category, classic, survival, daily, or xp.', 400)
  }
  if (!['today', 'weekly', 'alltime'].includes(period)) {
    return errorResponse('Invalid period. Use today, weekly, or alltime.', 400)
  }
  if (mode === 'category') {
    if (!category || !CATEGORIES.includes(category)) {
      return errorResponse('Invalid or missing category', 400)
    }
  }

  const supabase = createServiceClient()

  // ── XP Period (Weekly / Daily / All-Time by earned XP) ───────────────────────
  if (mode === 'xp') {
    if (period === 'alltime') {
      const { data: entries, error, count } = await supabase
        .from('leaderboard_global')
        .select('*', { count: 'exact' })
        .order('rank', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) return errorResponse('Failed to fetch leaderboard', 500)

      const { data: userEntry } = await supabase
        .from('leaderboard_global')
        .select('rank, total_xp')
        .eq('user_id', auth.userId)
        .maybeSingle()

      return jsonResponse({
        mode,
        period,
        entries: (entries ?? []).map(e => ({
          rank: e.rank,
          userId: e.user_id,
          displayName: e.display_name,
          level: e.level,
          primaryValue: e.total_xp,
        })),
        total: count ?? 0,
        userEntry: userEntry
          ? { rank: userEntry.rank, primaryValue: userEntry.total_xp }
          : null,
      })
    }

    if (period === 'weekly') {
      const { data: entries, error, count } = await supabase
        .from('xp_leaderboard_weekly')
        .select('*', { count: 'exact' })
        .order('rank', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) return errorResponse('Failed to fetch leaderboard', 500)

      const { data: userEntry } = await supabase
        .from('xp_leaderboard_weekly')
        .select('rank, weekly_xp, games_played')
        .eq('user_id', auth.userId)
        .maybeSingle()

      return jsonResponse({
        mode,
        period,
        entries: (entries ?? []).map(e => ({
          rank: e.rank,
          userId: e.user_id,
          displayName: e.display_name,
          level: e.level,
          primaryValue: e.weekly_xp,
          gamesPlayed: e.games_played,
        })),
        total: count ?? 0,
        userEntry: userEntry
          ? { rank: userEntry.rank, primaryValue: userEntry.weekly_xp }
          : null,
      })
    }

    if (period === 'today') {
      const { data: entries, error, count } = await supabase
        .from('xp_leaderboard_daily')
        .select('*', { count: 'exact' })
        .order('rank', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) return errorResponse('Failed to fetch leaderboard', 500)

      const { data: userEntry } = await supabase
        .from('xp_leaderboard_daily')
        .select('rank, daily_xp, games_played')
        .eq('user_id', auth.userId)
        .maybeSingle()

      return jsonResponse({
        mode,
        period,
        entries: (entries ?? []).map(e => ({
          rank: e.rank,
          userId: e.user_id,
          displayName: e.display_name,
          level: e.level,
          primaryValue: e.daily_xp,
          gamesPlayed: e.games_played,
        })),
        total: count ?? 0,
        userEntry: userEntry
          ? { rank: userEntry.rank, primaryValue: userEntry.daily_xp }
          : null,
      })
    }

    return errorResponse('Invalid period for xp mode. Use today, weekly, or alltime.', 400)
  }

  // ── Global ───────────────────────────────────────────────────────────────────
  if (mode === 'global') {
    const { data: entries, error, count } = await supabase
      .from('leaderboard_global')
      .select('*', { count: 'exact' })
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) return errorResponse('Failed to fetch leaderboard', 500)

    const { data: userEntry } = await supabase
      .from('leaderboard_global')
      .select('rank, total_xp')
      .eq('user_id', auth.userId)
      .maybeSingle()

    return jsonResponse({
      mode,
      period: 'alltime',
      entries: (entries ?? []).map(e => ({
        rank: e.rank,
        userId: e.user_id,
        displayName: e.display_name,
        level: e.level,
        primaryValue: e.total_xp,
      })),
      total: count ?? 0,
      userEntry: userEntry
        ? { rank: userEntry.rank, primaryValue: userEntry.total_xp }
        : null,
    })
  }

  // ── Per-Category ─────────────────────────────────────────────────────────────
  if (mode === 'category') {
    const { data: entries, error, count } = await supabase
      .from('leaderboard_by_category')
      .select('*', { count: 'exact' })
      .eq('category', category)
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) return errorResponse('Failed to fetch leaderboard', 500)

    const { data: userEntry } = await supabase
      .from('leaderboard_by_category')
      .select('rank, category_xp, games_played')
      .eq('category', category)
      .eq('user_id', auth.userId)
      .maybeSingle()

    return jsonResponse({
      mode,
      category,
      entries: (entries ?? []).map(e => ({
        rank: e.rank,
        userId: e.user_id,
        displayName: e.display_name,
        level: e.level,
        primaryValue: e.category_xp,
        gamesPlayed: e.games_played,
      })),
      total: count ?? 0,
      userEntry: userEntry
        ? { rank: userEntry.rank, primaryValue: userEntry.category_xp }
        : null,
    })
  }

  // ── Classic (legacy) ─────────────────────────────────────────────────────────
  if (mode === 'classic') {
    const viewName =
      period === 'today'   ? 'leaderboard_today' :
      period === 'weekly'  ? 'leaderboard_weekly' :
                             'leaderboard_all_time'

    const { data: entries, error, count } = await supabase
      .from(viewName)
      .select('*', { count: 'exact' })
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) return errorResponse('Failed to fetch leaderboard', 500)

    const { data: userEntry } = await supabase
      .from(viewName)
      .select('rank, best_xp')
      .eq('user_id', auth.userId)
      .maybeSingle()

    return jsonResponse({
      mode,
      period,
      entries: (entries ?? []).map(e => ({
        rank: e.rank,
        userId: e.user_id,
        displayName: e.display_name,
        level: e.level,
        bestXp: e.best_xp,
        gamesPlayed: e.games_played,
      })),
      total: count ?? 0,
      userEntry: userEntry
        ? { rank: userEntry.rank, primaryValue: userEntry.best_xp }
        : null,
    })
  }

  // ── Survival (legacy, now ranked purely by XP) ───────────────────────────────
  if (mode === 'survival') {
    let query = supabase
      .from('sudden_death_scores')
      .select('user_id, questions_answered, xp_earned')
      .order('xp_earned', { ascending: false })

    if (period === 'today') {
      query = query.gte('completed_at', new Date(new Date().toISOString().split('T')[0]).toISOString())
    } else if (period === 'weekly') {
      const weekStart = new Date()
      weekStart.setUTCHours(0, 0, 0, 0)
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
      query = query.gte('completed_at', weekStart.toISOString())
    }

    const { data: allRuns } = await query

    const bestByUser = new Map<string, { user_id: string; questions_answered: number; xp_earned: number }>()
    for (const run of allRuns ?? []) {
      const existing = bestByUser.get(run.user_id)
      if (!existing || run.xp_earned > existing.xp_earned) bestByUser.set(run.user_id, run)
    }

    const sorted = Array.from(bestByUser.values())
      .sort((a, b) => b.xp_earned - a.xp_earned)

    const page = sorted.slice(offset, offset + limit)
    const userIds = page.map(r => r.user_id)
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, display_name, level').in('id', userIds)
      : { data: [] }
    const userMap = new Map((users ?? []).map(u => [u.id, u]))

    const userRankIndex = sorted.findIndex(r => r.user_id === auth.userId)
    const userRun = userRankIndex >= 0 ? sorted[userRankIndex] : null

    return jsonResponse({
      mode,
      period,
      entries: page.map((r, i) => ({
        rank: offset + i + 1,
        userId: r.user_id,
        displayName: userMap.get(r.user_id)?.display_name ?? 'Unknown',
        level: userMap.get(r.user_id)?.level ?? 1,
        questionsAnswered: r.questions_answered,
        bestXp: r.xp_earned,
      })),
      total: sorted.length,
      userEntry: userRun
        ? { rank: userRankIndex + 1, primaryValue: userRun.xp_earned }
        : null,
    })
  }

  // ── Daily Challenge (legacy) ─────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]

  let completionsQuery = supabase
    .from('daily_challenge_completions')
    .select('user_id, xp_earned, correct_count, challenge_date')

  if (period === 'today') {
    completionsQuery = completionsQuery.eq('challenge_date', today)
  } else if (period === 'weekly') {
    const weekAgo = new Date()
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 6)
    completionsQuery = completionsQuery.gte('challenge_date', weekAgo.toISOString().split('T')[0])
  }

  const { data: completions } = await completionsQuery.order('xp_earned', { ascending: false })

  let all: Array<{ user_id: string; xp_earned: number; correct_count: number }>
  if (period === 'today') {
    all = completions ?? []
  } else {
    const bestByUser = new Map<string, { user_id: string; xp_earned: number; correct_count: number }>()
    for (const c of completions ?? []) {
      const existing = bestByUser.get(c.user_id)
      if (!existing || c.xp_earned > existing.xp_earned) bestByUser.set(c.user_id, c)
    }
    all = Array.from(bestByUser.values()).sort((a, b) => b.xp_earned - a.xp_earned)
  }

  const page = all.slice(offset, offset + limit)
  const userIds = page.map(r => r.user_id)
  const { data: users } = userIds.length > 0
    ? await supabase.from('users').select('id, display_name, level').in('id', userIds)
    : { data: [] }
  const userMap = new Map((users ?? []).map(u => [u.id, u]))

  const userRankIndex = all.findIndex(r => r.user_id === auth.userId)
  const userCompletion = userRankIndex >= 0 ? all[userRankIndex] : null

  return jsonResponse({
    mode,
    period,
    entries: page.map((r, i) => ({
      rank: offset + i + 1,
      userId: r.user_id,
      displayName: userMap.get(r.user_id)?.display_name ?? 'Unknown',
      level: userMap.get(r.user_id)?.level ?? 1,
      bestXp: r.xp_earned,
      correctCount: r.correct_count,
    })),
    total: all.length,
    userEntry: userCompletion
      ? { rank: userRankIndex + 1, primaryValue: userCompletion.xp_earned }
      : null,
  })
})
