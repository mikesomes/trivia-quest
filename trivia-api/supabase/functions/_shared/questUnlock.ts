export type QuestUnlockRule = 'all' | 'any'

export interface QuestUnlockInput {
  nodeId: string
  unlockLevel: number
  unlockRule?: string | null
  predecessorIds: string[]
  completedNodeIds: ReadonlySet<string>
  userLevel: number
}

/**
 * Server-authoritative quest access rule shared by every quest entry point.
 * Completed nodes are always replayable. A node without predecessors is a
 * starting node and only observes its level gate.
 */
export function isQuestNodeUnlocked(input: QuestUnlockInput): boolean {
  if (input.completedNodeIds.has(input.nodeId)) return true
  if (input.userLevel < input.unlockLevel) return false
  if (input.predecessorIds.length === 0) return true

  return input.unlockRule === 'any'
    ? input.predecessorIds.some(id => input.completedNodeIds.has(id))
    : input.predecessorIds.every(id => input.completedNodeIds.has(id))
}
