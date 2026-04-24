import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidCategory, isValidDifficulty, isValidUUID, parseBody } from '../_shared/validation.ts'
import { GAME_CONSTANTS, type ScoringTimerMode, type DifficultyMix } from '../_shared/types.ts'
import { getPerksForLevel } from '../_shared/scoring.ts'
import { getActiveRoundForUser } from '../../src/db/rounds.ts'
import { selectQuestionsForRound, selectQuestionsWithMix, selectQuestionsWithSegments } from '../../src/db/questions.ts'
import { checkRoundCreationLimit } from '../_shared/rateLimit.ts'
import { makeLogger, getRequestId } from '../_shared/logger.ts'

Deno.serve(async (req) => {
  const requestId = getRequestId(req)
  try {
    return await handler(req, requestId)
  } catch (err) {
    const log = makeLogger('create-round', requestId)
    log.error('Unhandled error', { error: err instanceof Error ? err.message : String(err) })
    return errorResponse(`Unhandled error: ${err instanceof Error ? err.message : String(err)}`, 500)
  }
})

async function handler(req: Request, requestId: string): Promise<Response> {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const log = makeLogger('create-round', requestId, auth.userId)

  const body = await parseBody<{
    category?: unknown
    difficulty?: unknown
    difficultyMix?: unknown
    difficultySegments?: unknown
    isSurvival?: unknown
    isQuest?: unknown
    isBlitz?: unknown
    questNodeId?: unknown
    continuationRoundId?: unknown
    questRunId?: unknown
  }>(req)
  if (body instanceof Response) return body

  if (!isValidCategory(body.category)) return errorResponse('Invalid category', 400)
  if (!isValidDifficulty(body.difficulty)) return errorResponse('Invalid difficulty', 400)

  // Validate difficultyMix if provided
  let validatedMix: DifficultyMix | null = null
  if (body.difficultyMix !== undefined) {
    const m = body.difficultyMix as Record<string, unknown>
    const e = typeof m?.easy   === 'number' && Number.isInteger(m.easy)   && m.easy   >= 0 ? m.easy   : null
    const me = typeof m?.medium === 'number' && Number.isInteger(m.medium) && m.medium >= 0 ? m.medium : null
    const h = typeof m?.hard   === 'number' && Number.isInteger(m.hard)   && m.hard   >= 0 ? m.hard   : null
    if (e === null || me === null || h === null) {
      return errorResponse('difficultyMix must have non-negative integer easy/medium/hard fields', 400)
    }
    validatedMix = { easy: e, medium: me, hard: h }
    // sum check happens after we know questionCount (after isBlitz is resolved)
  }

  // Parse difficultySegments if provided (mutually exclusive with difficultyMix)
  let parsedSegments: DifficultyMix[] | null = null
  if (body.difficultySegments !== undefined) {
    const segs = body.difficultySegments as unknown[]
    if (!Array.isArray(segs) || segs.length === 0) {
      return errorResponse('difficultySegments must be a non-empty array', 400)
    }
    const parsed: DifficultyMix[] = []
    for (const seg of segs) {
      const s = seg as Record<string, unknown>
      const e  = typeof s?.easy   === 'number' && Number.isInteger(s.easy)   && s.easy   >= 0 ? s.easy   : null
      const me = typeof s?.medium === 'number' && Number.isInteger(s.medium) && s.medium >= 0 ? s.medium : null
      const h  = typeof s?.hard   === 'number' && Number.isInteger(s.hard)   && s.hard   >= 0 ? s.hard   : null
      if (e === null || me === null || h === null) {
        return errorResponse('each difficultySegments entry must have non-negative integer easy/medium/hard', 400)
      }
      parsed.push({ easy: e, medium: me, hard: h })
    }
    parsedSegments = parsed
    // sum check happens after we know questionCount
  }

  const isQuest = body.isQuest === true
  let isBlitz = body.isBlitz === true

  const supabase = createServiceClient()

  // Rate limit: 60 rounds per hour per user
  const rateLimit = await checkRoundCreationLimit(supabase, auth.userId)
  if (!rateLimit.allowed) {
    log.warn('Rate limit exceeded', { remaining: rateLimit.remaining })
    return errorResponse('Too many rounds created. Please wait before starting another game.', 429)
  }

  // For quest rounds, derive starting lives/hammers/shields/maxLives from the player's level perks
  let startingLives: number
  let startingHammers = GAME_CONSTANTS.STARTING_HAMMERS
  let startingShields = GAME_CONSTANTS.STARTING_SHIELDS
  let maxLives = GAME_CONSTANTS.MAX_LIVES
  let isSurvival = body.isSurvival === true
  let scoringTimerMode: ScoringTimerMode = 'question'
  let questNodeId: string | null = null
  let questNodeGameMode: string | null = null
  let questNodeModeConfig: Record<string, unknown> = {}
  let startingStreak = 0
  let questPlayerLevel: number | null = null
  let questRunId: string | null = null
  let questRunRoundIndex: number | null = null

  if (isQuest) {
    if (typeof body.questNodeId !== 'string' || body.questNodeId.length === 0) {
      return errorResponse('questNodeId is required for quest rounds', 400)
    }

    const { data: questNode, error: questNodeError } = await supabase
      .from('quest_nodes')
      .select('id, category, difficulty, game_mode, mode_config, is_active, unlock_level')
      .eq('id', body.questNodeId)
      .eq('is_active', true)
      .maybeSingle()

    if (questNodeError) {
      log.error('Quest node lookup failed', { questNodeId: body.questNodeId, error: questNodeError.message })
      return errorResponse('Failed to validate quest round', 500)
    }
    if (!questNode) return errorResponse('Quest node not found', 404)

    const questDifficulty = questNode.difficulty === 'boss' ? 'hard' : questNode.difficulty
    if (questNode.category !== body.category || questDifficulty !== body.difficulty) {
      return errorResponse('Quest node does not match requested round', 400)
    }

    questNodeId = questNode.id
    questNodeGameMode = questNode.game_mode
    questNodeModeConfig = (questNode.mode_config ?? {}) as Record<string, unknown>
    isSurvival = questNode.game_mode === 'survival'
    isBlitz = isBlitz || questNode.game_mode === 'blitz'
    scoringTimerMode = questNode.game_mode === 'blitz' ? 'round' : 'question'

    const [progressResult, predecessorResult, completedResult, userResult] = await Promise.all([
      supabase
        .from('user_quest_progress')
        .select('cooldown_until')
        .eq('user_id', auth.userId)
        .eq('node_id', questNode.id)
        .maybeSingle(),
      supabase
        .from('quest_node_connections')
        .select('from_node_id')
        .eq('to_node_id', questNode.id),
      supabase
        .from('user_quest_progress')
        .select('node_id')
        .eq('user_id', auth.userId)
        .gt('stars', 0),
      supabase.from('users').select('level').eq('id', auth.userId).single(),
    ])

    if (progressResult.error || predecessorResult.error || completedResult.error || userResult.error) {
      return errorResponse('Failed to validate quest round', 500)
    }

    const completedNodeIds = new Set((completedResult.data ?? []).map((row) => row.node_id))
    const predecessorIds = (predecessorResult.data ?? []).map((row) => row.from_node_id)
    questPlayerLevel = userResult.data?.level ?? 1

    if (!completedNodeIds.has(questNode.id)) {
      const isUnlocked =
        questPlayerLevel >= questNode.unlock_level &&
        predecessorIds.every((predecessorId) => completedNodeIds.has(predecessorId))
      if (!isUnlocked) return errorResponse('Quest node is locked', 403)
    }

    if (
      progressResult.data?.cooldown_until &&
      new Date(progressResult.data.cooldown_until) > new Date()
    ) {
      return errorResponse('Quest node is cooling down', 409)
    }

    // If a multi-round run is in progress, override game mode / config from the run's current round def
    if (typeof body.questRunId === 'string' && body.questRunId.length > 0) {
      const { data: run, error: runError } = await supabase
        .from('user_quest_node_run')
        .select('id, node_id, current_round_index, status, rounds_total')
        .eq('id', body.questRunId)
        .eq('user_id', auth.userId)
        .maybeSingle()

      if (runError || !run) return errorResponse('Quest run not found', 404)
      if (run.status !== 'in_progress') return errorResponse('Quest run is not in progress', 409)
      if (run.node_id !== questNodeId) return errorResponse('Run does not belong to this node', 400)

      const { data: roundDef, error: rdError } = await supabase
        .from('quest_node_rounds')
        .select('game_mode, category, difficulty, mode_config')
        .eq('node_id', run.node_id)
        .eq('round_index', run.current_round_index)
        .maybeSingle()

      if (rdError || !roundDef) return errorResponse('Round definition not found', 404)

      // Override node-level game mode/config with the per-round definition
      questNodeGameMode = roundDef.game_mode
      questNodeModeConfig = (roundDef.mode_config ?? {}) as Record<string, unknown>
      isSurvival = roundDef.game_mode === 'survival'
      isBlitz = isBlitz || roundDef.game_mode === 'blitz'
      scoringTimerMode = roundDef.game_mode === 'blitz' ? 'round' : 'question'
      questRunId = run.id
      questRunRoundIndex = run.current_round_index
    }
  }

  if (isBlitz) {
    startingLives = GAME_CONSTANTS.STARTING_LIVES
    startingHammers = 0
    startingShields = GAME_CONSTANTS.STARTING_SHIELDS
    scoringTimerMode = 'round'
  } else if (isSurvival) {
    startingLives = 1
    startingStreak = await resolveSurvivalCarryStreak(
      supabase,
      auth.userId,
      body.continuationRoundId,
    )
  } else if (questNodeGameMode === 'streak') {
    // Streak nodes are one-life: a single wrong answer ends the attempt.
    // Pass criterion (target streak) is enforced at complete-quest-node.
    startingLives = 1
    startingHammers = 0
  } else if (isQuest) {
    const playerLevel = questPlayerLevel ?? 1
    const perks = getPerksForLevel(playerLevel)
    startingLives = perks.startingLives
    startingHammers = Math.max(GAME_CONSTANTS.STARTING_HAMMERS, perks.startingHammers)
    startingShields = Math.max(GAME_CONSTANTS.STARTING_SHIELDS, perks.startingShields)
    maxLives = perks.maxLives
  } else {
    startingLives = GAME_CONSTANTS.STARTING_LIVES
  }

  // Fetch user inventory and equipped loadout; apply only equipped items to round starting stats
  const { data: userInventory } = await supabase
    .from('users')
    .select('inventory_lives, inventory_hammers, inventory_shields, inventory_xp_booster, equipped_lives, equipped_hammers, equipped_shields, equipped_xp_booster')
    .eq('id', auth.userId)
    .single()

  // Clamp equipped to inventory in case of any inconsistency
  const eqLives   = Math.min(userInventory?.equipped_lives      ?? 0, userInventory?.inventory_lives      ?? 0)
  const eqHammers = Math.min(userInventory?.equipped_hammers    ?? 0, userInventory?.inventory_hammers    ?? 0)
  const eqShields = Math.min(userInventory?.equipped_shields    ?? 0, userInventory?.inventory_shields    ?? 0)
  const eqBooster = Math.min(userInventory?.equipped_xp_booster ?? 0, userInventory?.inventory_xp_booster ?? 0) > 0

  // Apply only equipped items on top of perk-based starting values (capped at round limits)
  // Blitz starts with 0 hammers intentionally — equipped hammers still apply
  startingLives   = Math.min(startingLives   + eqLives,   maxLives)
  startingHammers = Math.min(startingHammers + eqHammers, GAME_CONSTANTS.MAX_HAMMERS)
  startingShields = startingShields + eqShields
  const xpBoosterActive = eqBooster

  // Abandon any existing active round before creating a new one
  const existingRound = await getActiveRoundForUser(supabase, auth.userId).catch(() => null)
  if (existingRound) {
    await supabase
      .from('rounds')
      .update({ status: 'abandoned' })
      .eq('id', existingRound.id)
  }

  // Select questions
  //   Blitz serves a large pool — you answer as many as possible in the window.
  //   Survival/Streak also need headroom beyond 10 to let targets be reached.
  let questionCount: number
  if (isBlitz) {
    questionCount = GAME_CONSTANTS.BLITZ_QUESTIONS
  } else if (isSurvival || questNodeGameMode === 'streak') {
    questionCount = GAME_CONSTANTS.BLITZ_QUESTIONS
  } else {
    questionCount = GAME_CONSTANTS.QUESTIONS_PER_ROUND
  }

  if (validatedMix !== null) {
    const mixTotal = validatedMix.easy + validatedMix.medium + validatedMix.hard
    if (mixTotal !== questionCount) {
      return errorResponse(`difficultyMix sum (${mixTotal}) must equal question count (${questionCount})`, 400)
    }
  }

  if (parsedSegments !== null) {
    const segTotal = parsedSegments.reduce((sum, s) => sum + s.easy + s.medium + s.hard, 0)
    if (segTotal !== questionCount) {
      return errorResponse(`difficultySegments total (${segTotal}) must equal question count (${questionCount})`, 400)
    }
  }

  let questions
  try {
    questions = parsedSegments !== null
      ? await selectQuestionsWithSegments(supabase, body.category, parsedSegments, auth.userId)
      : validatedMix !== null
        ? await selectQuestionsWithMix(supabase, body.category, validatedMix, auth.userId)
        : await selectQuestionsForRound(supabase, body.category, body.difficulty, questionCount, auth.userId)
  } catch (err) {
    log.error('Question selection failed', { error: err instanceof Error ? err.message : String(err) })
    return errorResponse('Insufficient questions available. Please try again shortly.', 503)
  }

  // Create round
  //   Blitz expires after its mode-configured duration (defaults to GAME_CONSTANTS.BLITZ_SECONDS)
  //   so the server enforces the time limit regardless of client clock drift.
  //   Other modes use the standard round expiry window.
  const blitzDurationSeconds =
    typeof questNodeModeConfig.duration_seconds === 'number'
      ? (questNodeModeConfig.duration_seconds as number)
      : GAME_CONSTANTS.BLITZ_SECONDS
  const expiryMs = isBlitz
    ? blitzDurationSeconds * 1000
    : GAME_CONSTANTS.ROUND_EXPIRY_MINUTES * 60 * 1000
  const expiresAt = new Date(Date.now() + expiryMs).toISOString()
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .insert({
      user_id: auth.userId,
      category: body.category,
      difficulty: body.difficulty,
      status: 'active',
      lives_remaining: startingLives,
      is_survival: isSurvival,
      is_quest: isQuest,
      is_blitz: isBlitz,
      xp_booster_active: xpBoosterActive,
      quest_node_id: questNodeId,
      scoring_timer_mode: scoringTimerMode,
      hammers: startingHammers,
      shields: startingShields,
      max_lives: maxLives,
      streak: startingStreak,
      max_streak: startingStreak,
      mode_config: questNodeModeConfig,
      expires_at: expiresAt,
      quest_run_id: questRunId,
      quest_run_round_index: questRunRoundIndex,
    })
    .select()
    .single()

  if (roundError || !round) {
    log.error('Round insert failed', { error: roundError?.message })
    return errorResponse(`Failed to create round: ${roundError?.message ?? 'unknown'}`, 500)
  }

  // Track which round belongs to this run
  if (questRunId) {
    await supabase
      .from('user_quest_node_run')
      .update({ last_round_id: round.id })
      .eq('id', questRunId)
  }

  // Insert round_questions
  const roundQuestions = questions.map((q, index) => ({
    round_id: round.id,
    question_id: q.id,
    position: index,
    presented_at: index === 0 ? round.started_at : null,
  }))

  const { error: rqError } = await supabase.from('round_questions').insert(roundQuestions)
  if (rqError) {
    log.error('Round questions insert failed', { roundId: round.id, error: rqError.message })
    await supabase.from('rounds').delete().eq('id', round.id)
    return errorResponse(`Failed to assign questions to round: ${rqError.message}`, 500)
  }

  // Mark questions as used — increment times_used via RPC to avoid client-side arithmetic
  await supabase.rpc('increment_times_used', { question_ids: questions.map(q => q.id) })

  // Deduct only equipped items from inventory and reset equipped loadout
  const eqBoosterCount = Math.min(userInventory?.equipped_xp_booster ?? 0, userInventory?.inventory_xp_booster ?? 0)
  if (eqLives > 0 || eqHammers > 0 || eqShields > 0 || eqBoosterCount > 0) {
    await supabase
      .from('users')
      .update({
        inventory_lives:       Math.max(0, (userInventory?.inventory_lives      ?? 0) - eqLives),
        inventory_hammers:     Math.max(0, (userInventory?.inventory_hammers    ?? 0) - eqHammers),
        inventory_shields:     Math.max(0, (userInventory?.inventory_shields    ?? 0) - eqShields),
        inventory_xp_booster:  Math.max(0, (userInventory?.inventory_xp_booster ?? 0) - eqBoosterCount),
        equipped_lives:       0,
        equipped_hammers:     0,
        equipped_shields:     0,
        equipped_xp_booster:  0,
      })
      .eq('id', auth.userId)
  }

  log.info('Round created', { roundId: round.id, category: body.category, difficulty: body.difficulty })

  return jsonResponse(
    {
      roundId: round.id,
      category: round.category,
      difficulty: round.difficulty,
      totalQuestions: questionCount,
      expiresAt: round.expires_at,
      gameMode: questNodeGameMode ?? (isBlitz ? 'blitz' : isSurvival ? 'survival' : 'classic'),
      modeConfig: questNodeModeConfig,
      scoringTimerMode,
      questRunId,
      questRunRoundIndex,
    },
    201
  )
}

async function resolveSurvivalCarryStreak(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  continuationRoundId: unknown,
): Promise<number> {
  if (!isValidUUID(continuationRoundId)) return 0

  const { data: priorRound, error } = await supabase
    .from('rounds')
    .select('id, streak, status, is_survival, sd_submitted, completed_at')
    .eq('id', continuationRoundId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !priorRound) return 0
  if (priorRound.status !== 'completed' || !priorRound.is_survival || priorRound.sd_submitted) {
    return 0
  }

  const completedAt = priorRound.completed_at ? new Date(priorRound.completed_at) : null
  if (!completedAt || Number.isNaN(completedAt.getTime())) return 0

  const continuationDeadlineMs =
    completedAt.getTime() + GAME_CONSTANTS.ROUND_EXPIRY_MINUTES * 60 * 1000
  if (Date.now() > continuationDeadlineMs) return 0

  return Math.max(0, Math.floor(priorRound.streak ?? 0))
}
