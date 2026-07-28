import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { CATEGORIES, type Category } from '../_shared/types.ts'

type Period = 'today' | 'weekly' | 'alltime'
type Mode = 'global' | 'category' | 'classic' | 'survival' | 'daily' | 'xp' | 'blitz'

const PAGE_CAP = 100

interface RankedEntry {
  rank: number
  userId: string
  [key: string]: unknown
}

/** Attaches `previousRank` (from the last snapshot-leaderboard-ranks run) to each entry. */
async function attachPreviousRanks<T extends RankedEntry>(
  supabase: ReturnType<typeof createServiceClient>,
  snapshotMode: string,
  snapshotPeriod: string,
  entries: T[],
): Promise<(T & { previousRank: number | null })[]> {
  if (entries.length === 0) return []

  const { data: snapshots } = await supabase
    .from('leaderboard_rank_snapshots')
    .select('user_id, rank')
    .eq('mode', snapshotMode)
    .eq('period', snapshotPeriod)
    .in('user_id', entries.map(e => e.userId))

  const prevByUser = new Map((snapshots ?? []).map(s => [s.user_id, s.rank]))
  return entries.map(e => ({ ...e, previousRank: prevByUser.get(e.userId) ?? null }))
}

async function previousRankFor(
  supabase: ReturnType<typeof createServiceClient>,
  snapshotMode: string,
  snapshotPeriod: string,
  userId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('leaderboard_rank_snapshots')
    .select('rank')
    .eq('mode', snapshotMode)
    .eq('period', snapshotPeriod)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.rank ?? null
}

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

  if (!['global', 'category', 'classic', 'survival', 'daily', 'xp', 'blitz'].includes(mode)) {
    return errorResponse('Invalid mode. Use global, category, classic, survival, blitz, daily, or xp.', 400)
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

      const mappedEntries = (entries ?? []).map(e => ({
        rank: e.rank,
        userId: e.user_id,
        displayName: e.display_name,
        level: e.level,
        primaryValue: e.total_xp,
      }))

      return jsonResponse({
        mode,
        period,
        entries: await attachPreviousRanks(supabase, 'xp', 'alltime', mappedEntries),
        total: count ?? 0,
        userEntry: userEntry
          ? { rank: userEntry.rank, primaryValue: userEntry.total_xp, previousRank: await previousRankFor(supabase, 'xp', 'alltime', auth.userId) }
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

      const mappedEntries = (entries ?? []).map(e => ({
        rank: e.rank,
        userId: e.user_id,
        displayName: e.display_name,
        level: e.level,
        primaryValue: e.weekly_xp,
        gamesPlayed: e.games_played,
      }))

      return jsonResponse({
        mode,
        period,
        entries: await attachPreviousRanks(supabase, 'xp', 'weekly', mappedEntries),
        total: count ?? 0,
        userEntry: userEntry
          ? { rank: userEntry.rank, primaryValue: userEntry.weekly_xp, previousRank: await previousRankFor(supabase, 'xp', 'weekly', auth.userId) }
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

  // ── Classic (best session, ranked by session XP) ─────────────────────────────
  if (mode === 'classic') {
    const snapshotPeriod = period === 'weekly' ? 'weekly' : 'alltime'
    const viewName = snapshotPeriod === 'weekly' ? 'classic_leaderboard_weekly' : 'classic_leaderboard_alltime'

    const { data: entries, error, count } = await supabase
      .from(viewName)
      .select('*', { count: 'exact' })
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) return errorResponse('Failed to fetch leaderboard', 500)

    const { data: userEntry } = await supabase
      .from(viewName)
      .select('rank, session_xp_earned')
      .eq('user_id', auth.userId)
      .maybeSingle()

    const mappedEntries = (entries ?? []).map(e => ({
      rank: e.rank,
      userId: e.user_id,
      displayName: e.display_name,
      level: e.level,
      primaryValue: e.session_xp_earned,
      sessionRound: e.session_round,
      totalQuestions: e.total_questions,
    }))

    return jsonResponse({
      mode,
      period,
      entries: await attachPreviousRanks(supabase, 'classic', snapshotPeriod, mappedEntries),
      total: count ?? 0,
      userEntry: userEntry
        ? { rank: userEntry.rank, primaryValue: userEntry.session_xp_earned, previousRank: await previousRankFor(supabase, 'classic', snapshotPeriod, auth.userId) }
        : null,
    })
  }

  // ── Blitz (best run, ranked by correct answers) ───────────────────────────────
  if (mode === 'blitz') {
    const snapshotPeriod = period === 'weekly' ? 'weekly' : 'alltime'
    const viewName = snapshotPeriod === 'weekly' ? 'blitz_leaderboard_weekly' : 'blitz_leaderboard_alltime'

    const { data: entries, error, count } = await supabase
      .from(viewName)
      .select('*', { count: 'exact' })
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) return errorResponse('Failed to fetch leaderboard', 500)

    const { data: userEntry } = await supabase
      .from(viewName)
      .select('rank, correct_count')
      .eq('user_id', auth.userId)
      .maybeSingle()

    const mappedEntries = (entries ?? []).map(e => ({
      rank: e.rank,
      userId: e.user_id,
      displayName: e.display_name,
      level: e.level,
      primaryValue: e.correct_count,
      correctCount: e.correct_count,
    }))

    return jsonResponse({
      mode,
      period,
      entries: await attachPreviousRanks(supabase, 'blitz', snapshotPeriod, mappedEntries),
      total: count ?? 0,
      userEntry: userEntry
        ? { rank: userEntry.rank, primaryValue: userEntry.correct_count, previousRank: await previousRankFor(supabase, 'blitz', snapshotPeriod, auth.userId) }
        : null,
    })
  }

  // ── Survival (ranked by questions answered, then XP as tiebreaker) ───────────
  if (mode === 'survival') {
    let query = supabase
      .from('sudden_death_scores')
      .select('user_id, questions_answered, xp_earned')
      .order('questions_answered', { ascending: false })

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
      if (!existing ||
          run.questions_answered > existing.questions_answered ||
          (run.questions_answered === existing.questions_answered && run.xp_earned > existing.xp_earned)
      ) {
        bestByUser.set(run.user_id, run)
      }
    }

    const sorted = Array.from(bestByUser.values())
      .sort((a, b) =>
        b.questions_answered - a.questions_answered || b.xp_earned - a.xp_earned
      )

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
        // Ranked by questions_answered (see sort above), so primaryValue must
        // match that — not xp_earned — or it disagrees with userEntry below
        // and with the actual rank ordering (same bug class fixed earlier
        // this session for Blitz mode).
        primaryValue: r.questions_answered,
        questionsAnswered: r.questions_answered,
      })),
      total: sorted.length,
      userEntry: userRun
        ? { rank: userRankIndex + 1, primaryValue: userRun.questions_answered }
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
