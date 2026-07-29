import { describe, expect, it } from 'vitest'
import { isQuestNodeUnlocked } from '../../supabase/functions/_shared/questUnlock'

const completed = (...ids: string[]) => new Set(ids)

describe('isQuestNodeUnlocked', () => {
  it('opens a starting node when its level gate is met', () => {
    expect(isQuestNodeUnlocked({
      nodeId: 'start',
      unlockLevel: 1,
      predecessorIds: [],
      completedNodeIds: completed(),
      userLevel: 1,
    })).toBe(true)
  })

  it('respects the level gate even for starting nodes', () => {
    expect(isQuestNodeUnlocked({
      nodeId: 'start',
      unlockLevel: 3,
      predecessorIds: [],
      completedNodeIds: completed(),
      userLevel: 2,
    })).toBe(false)
  })

  it('requires every predecessor for the default all rule', () => {
    const base = {
      nodeId: 'boss',
      unlockLevel: 1,
      predecessorIds: ['easy', 'hard'],
      userLevel: 4,
    }
    expect(isQuestNodeUnlocked({ ...base, completedNodeIds: completed('easy') })).toBe(false)
    expect(isQuestNodeUnlocked({ ...base, completedNodeIds: completed('easy', 'hard') })).toBe(true)
  })

  it('accepts one predecessor for an any-rule fork', () => {
    expect(isQuestNodeUnlocked({
      nodeId: 'summit',
      unlockLevel: 1,
      unlockRule: 'any',
      predecessorIds: ['easy', 'medium', 'hard'],
      completedNodeIds: completed('hard'),
      userLevel: 1,
    })).toBe(true)
  })

  it('always allows replaying a completed node', () => {
    expect(isQuestNodeUnlocked({
      nodeId: 'old-node',
      unlockLevel: 99,
      predecessorIds: ['missing'],
      completedNodeIds: completed('old-node'),
      userLevel: 1,
    })).toBe(true)
  })
})
