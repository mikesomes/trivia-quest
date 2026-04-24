import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const supabase = createServiceClient()

  // Fetch all active nodes + connections in parallel
  const [nodesResult, connectionsResult, progressResult, userResult, roundDefsResult] = await Promise.all([
    supabase.from('quest_nodes').select('*').eq('is_active', true).order('position_y'),
    supabase.from('quest_node_connections').select('from_node_id, to_node_id'),
    supabase.from('user_quest_progress').select('node_id, stars, best_score, attempts, completed_at, failure_count, cooldown_until').eq('user_id', auth.userId),
    supabase.from('users').select('level').eq('id', auth.userId).single(),
    supabase.from('quest_node_rounds').select('node_id, round_index'),
  ])

  if (nodesResult.error) return errorResponse('Failed to fetch nodes', 500)

  const nodes = nodesResult.data ?? []
  const connections = connectionsResult.data ?? []
  const progress = new Map((progressResult.data ?? []).map(r => [r.node_id, r]))
  const userLevel = userResult.data?.level ?? 1

  // Count how many rounds each multi-round node has (nodes with no rows = single-round)
  const roundCountByNode = new Map<string, number>()
  for (const row of roundDefsResult.data ?? []) {
    roundCountByNode.set(row.node_id, (roundCountByNode.get(row.node_id) ?? 0) + 1)
  }

  // Build set of completed node IDs
  const completedIds = new Set(
    (progressResult.data ?? []).filter(r => r.stars > 0).map(r => r.node_id)
  )

  // Starting nodes (no incoming connections) are always available at level 1
  const hasIncoming = new Set(connections.map(c => c.to_node_id))

  const nodesWithStatus = nodes.map(node => {
    const prog = progress.get(node.id)
    const isCompleted = completedIds.has(node.id)

    // Determine if unlocked
    let isUnlocked = false
    if (!hasIncoming.has(node.id)) {
      // Starting node
      isUnlocked = userLevel >= node.unlock_level
    } else {
      // All predecessor nodes must be completed AND user meets level req
      const predecessors = connections.filter(c => c.to_node_id === node.id).map(c => c.from_node_id)
      const allPredsComplete = predecessors.every(pid => completedIds.has(pid))
      isUnlocked = allPredsComplete && userLevel >= node.unlock_level
    }

    let status: 'locked' | 'available' | 'completed'
    if (isCompleted) status = 'completed'
    else if (isUnlocked) status = 'available'
    else status = 'locked'

    return {
      id: node.id,
      title: node.title,
      description: node.description,
      category: node.category,
      difficulty: node.difficulty,
      gameMode: node.game_mode,
      branch: node.branch,
      positionX: node.position_x,
      positionY: node.position_y,
      xpReward: node.xp_reward,
      passThreshold: node.pass_threshold,
      star2Threshold: node.star_2_threshold,
      star3Threshold: node.star_3_threshold,
      modeConfig: node.mode_config ?? {},
      unlockLevel: node.unlock_level,
      status,
      stars: prog?.stars ?? 0,
      bestXp: prog?.best_score ?? 0,
      attempts: prog?.attempts ?? 0,
      completedAt: prog?.completed_at ?? null,
      failureCount: prog?.failure_count ?? 0,
      cooldownUntil: prog?.cooldown_until ?? null,
      roundsTotal: roundCountByNode.get(node.id) ?? 1,
    }
  })

  return jsonResponse({
    nodes: nodesWithStatus,
    connections: connections.map(c => ({ from: c.from_node_id, to: c.to_node_id })),
    userLevel,
  })
})
