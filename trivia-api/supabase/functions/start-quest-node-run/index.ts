import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { parseBody } from '../_shared/validation.ts'
import { makeLogger, getRequestId } from '../_shared/logger.ts'

Deno.serve(async (req) => {
  const requestId = getRequestId(req)
  try {
    return await handler(req, requestId)
  } catch (err) {
    const log = makeLogger('start-quest-node-run', requestId)
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

  const log = makeLogger('start-quest-node-run', requestId, auth.userId)

  const body = await parseBody<{ nodeId?: unknown }>(req)
  if (body instanceof Response) return body

  if (typeof body.nodeId !== 'string' || body.nodeId.length === 0) {
    return errorResponse('nodeId is required', 400)
  }

  const nodeId = body.nodeId
  const supabase = createServiceClient()

  // Verify node exists and is active
  const { data: node, error: nodeError } = await supabase
    .from('quest_nodes')
    .select('id, category, difficulty, game_mode, unlock_level, is_active')
    .eq('id', nodeId)
    .eq('is_active', true)
    .maybeSingle()

  if (nodeError) {
    log.error('Node lookup failed', { nodeId, error: nodeError.message })
    return errorResponse('Failed to look up quest node', 500)
  }
  if (!node) return errorResponse('Quest node not found', 404)

  // Check unlock / cooldown
  const [progressResult, predecessorResult, completedResult, userResult] = await Promise.all([
    supabase
      .from('user_quest_progress')
      .select('cooldown_until')
      .eq('user_id', auth.userId)
      .eq('node_id', nodeId)
      .maybeSingle(),
    supabase
      .from('quest_node_connections')
      .select('from_node_id')
      .eq('to_node_id', nodeId),
    supabase
      .from('user_quest_progress')
      .select('node_id')
      .eq('user_id', auth.userId)
      .gt('stars', 0),
    supabase.from('users').select('level').eq('id', auth.userId).single(),
  ])

  if (progressResult.error || predecessorResult.error || completedResult.error || userResult.error) {
    return errorResponse('Failed to verify quest access', 500)
  }

  const completedNodeIds = new Set((completedResult.data ?? []).map((r: { node_id: string }) => r.node_id))
  const predecessorIds = (predecessorResult.data ?? []).map((r: { from_node_id: string }) => r.from_node_id)
  const userLevel = userResult.data?.level ?? 1

  if (!completedNodeIds.has(nodeId)) {
    const isUnlocked =
      userLevel >= node.unlock_level &&
      predecessorIds.every((id: string) => completedNodeIds.has(id))
    if (!isUnlocked) return errorResponse('Quest node is locked', 403)
  }

  if (
    progressResult.data?.cooldown_until &&
    new Date(progressResult.data.cooldown_until) > new Date()
  ) {
    return errorResponse('Quest node is cooling down', 409)
  }

  // Fetch round definitions for this node
  const { data: roundDefs, error: roundDefsError } = await supabase
    .from('quest_node_rounds')
    .select('round_index, game_mode, category, difficulty, pass_threshold, mode_config')
    .eq('node_id', nodeId)
    .order('round_index', { ascending: true })

  if (roundDefsError) {
    log.error('Round defs lookup failed', { nodeId, error: roundDefsError.message })
    return errorResponse('Failed to load round definitions', 500)
  }

  const isMultiRound = roundDefs && roundDefs.length > 1
  const roundsTotal = isMultiRound ? roundDefs.length : 1

  // Abandon any existing in_progress run for this node
  await supabase
    .from('user_quest_node_run')
    .update({ status: 'abandoned' })
    .eq('user_id', auth.userId)
    .eq('node_id', nodeId)
    .eq('status', 'in_progress')

  if (!isMultiRound) {
    // Single-round node — no run row needed; caller uses /create-round directly.
    return jsonResponse({
      isMultiRound: false,
      runId: null,
      roundsTotal: 1,
      currentRoundIndex: 0,
      firstRound: roundDefs?.[0] ? {
        gameMode: roundDefs[0].game_mode,
        category: roundDefs[0].category ?? node.category,
        difficulty: roundDefs[0].difficulty,
        modeConfig: roundDefs[0].mode_config ?? {},
      } : {
        gameMode: node.game_mode,
        category: node.category,
        difficulty: node.difficulty === 'boss' ? 'hard' : node.difficulty,
        modeConfig: {},
      },
    })
  }

  // Create the run row
  const { data: run, error: runError } = await supabase
    .from('user_quest_node_run')
    .insert({
      user_id: auth.userId,
      node_id: nodeId,
      rounds_total: roundsTotal,
      current_round_index: 0,
      status: 'in_progress',
    })
    .select()
    .single()

  if (runError || !run) {
    log.error('Run insert failed', { nodeId, error: runError?.message })
    return errorResponse('Failed to start quest run', 500)
  }

  const firstDef = roundDefs[0]
  log.info('Quest run started', { runId: run.id, nodeId, roundsTotal })

  return jsonResponse({
    isMultiRound: true,
    runId: run.id,
    roundsTotal,
    currentRoundIndex: 0,
    firstRound: {
      gameMode: firstDef.game_mode,
      category: firstDef.category ?? node.category,
      difficulty: firstDef.difficulty,
      modeConfig: firstDef.mode_config ?? {},
    },
  }, 201)
}
