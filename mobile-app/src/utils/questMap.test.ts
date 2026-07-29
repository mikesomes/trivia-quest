import { getNextQuestFocusNode, getQuestNodePresentation } from './questMap'
import type { QuestMapNode } from '../types/questMap'

function node(overrides: Partial<QuestMapNode>): QuestMapNode {
  return {
    id: 'node',
    title: 'Node',
    description: 'Description',
    category: 'general_knowledge',
    difficulty: 'easy',
    gameMode: 'classic',
    branch: 'easy',
    positionX: 0.5,
    positionY: 0.5,
    regionId: 'knowledge_isles',
    visualMetadata: {},
    unlockRule: 'all',
    xpReward: 100,
    lootTier: 'wood',
    rewardPreview: { label: 'Wood Chest', coinMin: 40, coinMax: 90, possibleTypes: [] },
    status: 'locked',
    stars: 0,
    bestXp: 0,
    attempts: 0,
    completedAt: null,
    failureCount: 0,
    cooldownUntil: null,
    roundsTotal: 1,
    ...overrides,
  }
}

describe('quest map presentation', () => {
  it('makes available and completed nodes playable', () => {
    expect(getQuestNodePresentation(node({ status: 'available' })).canPlay).toBe(true)
    expect(getQuestNodePresentation(node({ status: 'completed' })).canPlay).toBe(true)
  })

  it('keeps locked and cooling nodes disabled', () => {
    expect(getQuestNodePresentation(node({ status: 'locked' })).canPlay).toBe(false)
    expect(getQuestNodePresentation(node({ status: 'cooldown' })).actionLabel).toBe('Cooling down')
  })

  it('focuses a newly available outgoing node after completion', () => {
    const target = node({ id: 'summit', status: 'available', positionY: 0.1 })
    const fallback = node({ id: 'route', status: 'available', positionY: 0.5 })
    expect(getNextQuestFocusNode(
      [fallback, target],
      [{ from: 'completed', to: 'summit' }],
      'completed',
    )?.id).toBe('summit')
  })
})
