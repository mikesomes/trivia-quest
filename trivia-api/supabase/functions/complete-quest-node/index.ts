import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import { isQuestNodeUnlocked } from '../_shared/questUnlock.ts'
import { isFirstClearRewardEligible } from '../_shared/questReward.ts'

// Cooldown after each failed quest attempt.
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000

function cooldownMs(failureCount: number): number {
  return failureCount > 0 ? FAILURE_COOLDOWN_MS : 0
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

async function claimFirstClearReward(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  nodeId: string,
  eligible: boolean,
) {
  if (!eligible) return null
  const { data, error } = await supabase.rpc('claim_quest_node_reward', {
    p_user_id: userId,
    p_node_id: nodeId,
  })
  if (error) {
    console.error('[complete-quest-node] quest reward failed', error.message)
    return null
  }
  return data
}

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<{ nodeId?: unknown; roundId?: unknown; questRunId?: unknown }>(req)
  if (body instanceof Response) return body

  if (typeof body.nodeId !== 'string') return errorResponse('Invalid nodeId', 400)
  if (!isValidUUID(body.roundId)) return errorResponse('Invalid roundId', 400)

  const supabase = createServiceClient()
  const now = new Date()

  // Fetch node, round, and unlock state in parallel
  const [
    nodeResult,
    roundResult,
    progressResult,
    userResult,
    predecessorResult,
    completedResult,
  ] = await Promise.all([
    supabase.from('quest_nodes').select('*').eq('id', body.nodeId).eq('is_active', true).single(),
    supabase
      .from('rounds')
      .select('id, status, is_quest, quest_node_id, xp_earned_in_round, max_streak, mode_config')
      .eq('id', body.roundId)
      .eq('user_id', auth.userId)
      .single(),
    supabase.from('user_quest_progress')
      .select('stars, best_score, attempts, failure_count, cooldown_until')
      .eq('user_id', auth.userId)
      .eq('node_id', body.nodeId)
      .maybeSingle(),
    supabase.from('users').select('level').eq('id', auth.userId).single(),
    supabase
      .from('quest_node_connections')
      .select('from_node_id')
      .eq('to_node_id', body.nodeId),
    supabase
      .from('user_quest_progress')
      .select('node_id')
      .eq('user_id', auth.userId)
      .gt('stars', 0),
  ])

  if (nodeResult.error || !nodeResult.data) return errorResponse('Node not found', 404)
  if (roundResult.error || !roundResult.data) return errorResponse('Round not found', 404)
  if (progressResult.error || userResult.error || predecessorResult.error || completedResult.error) {
    return errorResponse('Failed to verify quest progress', 500)
  }

  const node = nodeResult.data
  const round = roundResult.data
  const existing = progressResult.data
  const completedNodeIds = new Set((completedResult.data ?? []).map((row) => row.node_id))
  const predecessorIds = (predecessorResult.data ?? []).map((row) => row.from_node_id)
  const userLevel = userResult.data?.level ?? 1

  if (round.status !== 'completed') return errorResponse('Round not completed', 400)
  if (!round.is_quest) return errorResponse('Round is not a quest round', 400)
  if (round.quest_node_id !== body.nodeId) {
    return errorResponse('Round does not belong to this quest node', 400)
  }

  const { data: answers } = await supabase
    .from('answers')
    .select('is_correct')
    .eq('round_id', body.roundId)

  const totalAnswers = answers?.length ?? 0
  const correctCount = answers?.filter((answer: { is_correct: boolean }) => answer.is_correct).length ?? 0
  const accuracy = totalAnswers > 0 ? correctCount / totalAnswers : 0
  const maxStreak = round.max_streak ?? 0
  const modeConfig = (round.mode_config ?? {}) as Record<string, unknown>
  const gameMode: string = node.game_mode ?? 'classic'

  // ── Multi-round run handling ──────────────────────────────────────────────
  // If a questRunId is provided, we advance the run rather than immediately
  // settling the node. The node only gets settled on the final round pass.
  const isRunSubmission = typeof body.questRunId === 'string' && body.questRunId.length > 0

  if (isRunSubmission) {
    const { data: run, error: runError } = await supabase
      .from('user_quest_node_run')
      .select('id, node_id, current_round_index, rounds_total, rounds_passed, aggregate_stars, status')
      .eq('id', body.questRunId)
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (runError || !run) return errorResponse('Quest run not found', 404)
    if (run.status !== 'in_progress') return errorResponse('Quest run is not in progress', 409)
    if (run.node_id !== body.nodeId) return errorResponse('Run does not belong to this node', 400)

    // Fetch per-round definition to get mode-specific thresholds
    const { data: roundDef } = await supabase
      .from('quest_node_rounds')
      .select('game_mode, pass_threshold, mode_config')
      .eq('node_id', run.node_id)
      .eq('round_index', run.current_round_index)
      .maybeSingle()

    const roundGameMode: string = roundDef?.game_mode ?? gameMode
    const roundModeConfig = (roundDef?.mode_config ?? modeConfig) as Record<string, unknown>

    // Compute round-level stars using per-round config
    let roundStars = 0
    if (roundGameMode === 'blitz') {
      const passCount = numberFrom(roundModeConfig.min_correct_to_pass, 8)
      const s2Count   = numberFrom(roundModeConfig.star_2_correct, 14)
      const s3Count   = numberFrom(roundModeConfig.star_3_correct, 20)
      if (correctCount >= s3Count)        roundStars = 3
      else if (correctCount >= s2Count)   roundStars = 2
      else if (correctCount >= passCount) roundStars = 1
    } else if (roundGameMode === 'survival' || roundGameMode === 'streak') {
      const target = numberFrom(roundModeConfig.target_streak, 6)
      const s2     = numberFrom(roundModeConfig.star_2_streak, target + 4)
      const s3     = numberFrom(roundModeConfig.star_3_streak, target + 8)
      if (maxStreak >= s3)          roundStars = 3
      else if (maxStreak >= s2)     roundStars = 2
      else if (maxStreak >= target) roundStars = 1
    } else {
      const pt = typeof roundDef?.pass_threshold === 'number' ? roundDef.pass_threshold : node.pass_threshold
      if (accuracy >= node.star_3_threshold)      roundStars = 3
      else if (accuracy >= node.star_2_threshold) roundStars = 2
      else if (accuracy >= pt)                    roundStars = 1
    }

    const roundPassed = roundStars > 0
    const newRoundsPassed = run.rounds_passed + (roundPassed ? 1 : 0)
    const newAggregateStars = run.aggregate_stars + roundStars
    const isLastRound = run.current_round_index >= run.rounds_total - 1

    if (!roundPassed) {
      // Fail the whole run and apply cooldown
      const prevFailureCount = existing?.failure_count ?? 0
      const newFailureCount = prevFailureCount + 1
      const ms = cooldownMs(newFailureCount)
      const cooldownUntil = new Date(Date.now() + ms).toISOString()

      await Promise.all([
        supabase
          .from('user_quest_node_run')
          .update({ status: 'failed', completed_at: now.toISOString(), rounds_passed: newRoundsPassed })
          .eq('id', run.id),
        supabase.from('user_quest_progress').upsert({
          user_id: auth.userId,
          node_id: body.nodeId,
          stars: existing?.stars ?? 0,
          best_score: existing?.best_score ?? 0,
          attempts: (existing?.attempts ?? 0) + 1,
          failure_count: newFailureCount,
          cooldown_until: cooldownUntil,
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id,node_id' }),
      ])

      return jsonResponse({
        runComplete: true,
        passed: false,
        roundPassed: false,
        roundStars,
        currentRoundIndex: run.current_round_index,
        roundsTotal: run.rounds_total,
        stars: 0,
        previousStars: existing?.stars ?? 0,
        accuracy: Math.round(accuracy * 100),
        correctCount,
        totalAnswers,
        maxStreak,
        gameMode: roundGameMode,
        xpAwarded: 0,
        roundXp: round.xp_earned_in_round ?? 0,
        cooldownUntil,
        failureCount: newFailureCount,
      })
    }

    if (!isLastRound) {
      // Advance to next round
      const nextRoundIndex = run.current_round_index + 1
      const { data: nextDef } = await supabase
        .from('quest_node_rounds')
        .select('game_mode, category, difficulty, mode_config')
        .eq('node_id', run.node_id)
        .eq('round_index', nextRoundIndex)
        .maybeSingle()

      await supabase
        .from('user_quest_node_run')
        .update({
          current_round_index: nextRoundIndex,
          rounds_passed: newRoundsPassed,
          aggregate_stars: newAggregateStars,
        })
        .eq('id', run.id)

      return jsonResponse({
        runComplete: false,
        passed: false,
        roundPassed: true,
        roundStars,
        currentRoundIndex: run.current_round_index,
        nextRoundIndex,
        roundsTotal: run.rounds_total,
        accuracy: Math.round(accuracy * 100),
        correctCount,
        totalAnswers,
        maxStreak,
        gameMode: roundGameMode,
        roundXp: round.xp_earned_in_round ?? 0,
        nextRound: nextDef ? {
          gameMode: nextDef.game_mode,
          category: nextDef.category ?? node.category,
          difficulty: nextDef.difficulty,
          modeConfig: nextDef.mode_config ?? {},
        } : null,
      })
    }

    // Final round passed — aggregate stars (floor average), settle node
    const finalStars = Math.min(3, Math.floor(newAggregateStars / run.rounds_total))
    const prevStars = existing?.stars ?? 0
    const isFirstCompletion = !existing || prevStars === 0
    const starImprovement = finalStars > prevStars

    let xpAwarded = 0
    if (isFirstCompletion) {
      xpAwarded = node.xp_reward
    } else if (starImprovement) {
      xpAwarded = Math.floor(node.xp_reward * 0.25 * (finalStars - prevStars))
    }

    const roundXp = round.xp_earned_in_round ?? 0
    const newBestXp = Math.max(existing?.best_score ?? 0, roundXp)
    const newStars = Math.max(prevStars, finalStars)

    await Promise.all([
      supabase
        .from('user_quest_node_run')
        .update({ status: 'passed', completed_at: now.toISOString(), rounds_passed: newRoundsPassed, aggregate_stars: newAggregateStars })
        .eq('id', run.id),
      supabase.from('user_quest_progress').upsert({
        user_id: auth.userId,
        node_id: body.nodeId,
        stars: newStars,
        best_score: newBestXp,
        attempts: (existing?.attempts ?? 0) + 1,
        failure_count: 0,
        cooldown_until: null,
        completed_at: isFirstCompletion ? now.toISOString() : undefined,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id,node_id' }),
    ])

    if (xpAwarded > 0) {
      await supabase.rpc('award_challenge_xp', { p_user_id: auth.userId, p_xp: xpAwarded })
    }
    const reward = await claimFirstClearReward(
      supabase,
      auth.userId,
      body.nodeId,
      isFirstClearRewardEligible(true, prevStars),
    )

    return jsonResponse({
      runComplete: true,
      passed: true,
      roundPassed: true,
      roundStars,
      currentRoundIndex: run.current_round_index,
      roundsTotal: run.rounds_total,
      stars: finalStars,
      previousStars: prevStars,
      accuracy: Math.round(accuracy * 100),
      correctCount,
      totalAnswers,
      maxStreak,
      gameMode: roundGameMode,
      xpAwarded,
      roundXp,
      reward,
      cooldownUntil: null,
      failureCount: 0,
    })
  }
  // ── End multi-round run handling ──────────────────────────────────────────

  const isUnlocked = isQuestNodeUnlocked({
    nodeId: body.nodeId,
    unlockLevel: node.unlock_level,
    unlockRule: node.unlock_rule,
    predecessorIds,
    completedNodeIds,
    userLevel,
  })
  if (!isUnlocked) return errorResponse('Quest node is locked', 403)

  if (existing?.cooldown_until && new Date(existing.cooldown_until) > now) {
    return errorResponse('Quest node is cooling down', 409)
  }

  // Mode-specific star calculation
  //   classic/boss_battle → accuracy thresholds (default behaviour)
  //   blitz               → correct-count thresholds from mode_config
  //   survival/streak     → streak-length thresholds from mode_config
  let stars = 0

  if (gameMode === 'blitz') {
    const passCount = numberFrom(modeConfig.min_correct_to_pass, 8)
    const s2Count   = numberFrom(modeConfig.star_2_correct,      14)
    const s3Count   = numberFrom(modeConfig.star_3_correct,      20)
    if (correctCount >= s3Count)      stars = 3
    else if (correctCount >= s2Count) stars = 2
    else if (correctCount >= passCount) stars = 1
  } else if (gameMode === 'survival' || gameMode === 'streak') {
    const target = numberFrom(modeConfig.target_streak, 6)
    const s2     = numberFrom(modeConfig.star_2_streak, target + 4)
    const s3     = numberFrom(modeConfig.star_3_streak, target + 8)
    if (maxStreak >= s3)          stars = 3
    else if (maxStreak >= s2)     stars = 2
    else if (maxStreak >= target) stars = 1
  } else {
    if (accuracy >= node.star_3_threshold)      stars = 3
    else if (accuracy >= node.star_2_threshold) stars = 2
    else if (accuracy >= node.pass_threshold)   stars = 1
  }

  const passed = stars > 0

  const prevStars = existing?.stars ?? 0
  const prevFailureCount = existing?.failure_count ?? 0
  const isFirstCompletion = !existing || prevStars === 0
  const starImprovement = passed && stars > prevStars

  // XP: full on first pass, partial on star improvement
  let xpAwarded = 0
  if (passed && isFirstCompletion) {
    xpAwarded = node.xp_reward
  } else if (starImprovement) {
    xpAwarded = Math.floor(node.xp_reward * 0.25 * (stars - prevStars))
  }

  // Compute new failure tracking + cooldown
  let newFailureCount: number
  let cooldownUntil: string | null

  if (passed) {
    // Reset on pass
    newFailureCount = 0
    cooldownUntil = null
  } else {
    newFailureCount = prevFailureCount + 1
    const ms = cooldownMs(newFailureCount)
    cooldownUntil = new Date(Date.now() + ms).toISOString()
  }

  // Upsert progress
  const newStars = Math.max(prevStars, passed ? stars : 0)
  const roundXp = round.xp_earned_in_round ?? 0
  const newBestXp = Math.max(existing?.best_score ?? 0, roundXp)

  await supabase.from('user_quest_progress').upsert({
    user_id: auth.userId,
    node_id: body.nodeId,
    stars: newStars,
    best_score: newBestXp,
    attempts: (existing?.attempts ?? 0) + 1,
    failure_count: newFailureCount,
    cooldown_until: cooldownUntil,
    completed_at: passed && isFirstCompletion ? now.toISOString() : undefined,
    updated_at: now.toISOString(),
  }, { onConflict: 'user_id,node_id' })

  // Award XP
  if (xpAwarded > 0) {
    await supabase.rpc('award_challenge_xp', { p_user_id: auth.userId, p_xp: xpAwarded })
  }
  const reward = await claimFirstClearReward(
    supabase,
    auth.userId,
    body.nodeId,
    isFirstClearRewardEligible(passed, prevStars),
  )

  return jsonResponse({
    passed,
    stars,
    previousStars: prevStars,
    accuracy: Math.round(accuracy * 100),
    correctCount,
    totalAnswers,
    maxStreak,
    gameMode,
    xpAwarded,
    roundXp,
    reward,
    cooldownUntil,
    failureCount: newFailureCount,
  })
})
