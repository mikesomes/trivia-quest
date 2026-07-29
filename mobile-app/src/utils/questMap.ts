import type { QuestMapNode } from '../types/questMap'

export const QUEST_DIFFICULTY_META = {
  easy: { label: 'Easy route', color: '#65DFC1' },
  medium: { label: 'Medium route', color: '#F1B84B' },
  hard: { label: 'Hard route', color: '#B092FF' },
  boss: { label: 'Boss challenge', color: '#FFD66B' },
} as const

export function getQuestNodePresentation(node: QuestMapNode) {
  const difficulty = QUEST_DIFFICULTY_META[node.difficulty]
  const canPlay = node.status === 'available' || node.status === 'completed'
  const actionLabel = node.status === 'completed'
    ? 'Replay challenge'
    : node.status === 'cooldown'
      ? 'Cooling down'
      : node.status === 'locked'
        ? 'Route locked'
        : 'Begin challenge'

  return {
    difficulty,
    canPlay,
    actionLabel,
    isAvailable: node.status === 'available',
    isCompleted: node.status === 'completed',
  }
}

export function getNextQuestFocusNode(
  nodes: QuestMapNode[],
  connections: Array<{ from: string; to: string }>,
  completedNodeId?: string,
) {
  if (completedNodeId) {
    const outgoing = new Set(
      connections.filter(connection => connection.from === completedNodeId).map(connection => connection.to)
    )
    const newlyAvailable = nodes.find(node => outgoing.has(node.id) && node.status === 'available')
    if (newlyAvailable) return newlyAvailable
  }

  return nodes
    .filter(node => node.status === 'available')
    .sort((a, b) => b.positionY - a.positionY)[0]
}
