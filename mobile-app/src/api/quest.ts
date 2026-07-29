import { apiGet, apiPost } from './client'
import type {
  CompleteQuestNodeResponse,
  QuestMapResponse,
  StartQuestNodeResponse,
} from '../types/questMap'

export const questApi = {
  getMap: () => apiGet<QuestMapResponse>('/get-quest-map'),
  startNode: (nodeId: string) =>
    apiPost<StartQuestNodeResponse>('/start-quest-node-run', { nodeId }),
  completeNode: (nodeId: string, roundId: string, questRunId?: string | null) =>
    apiPost<CompleteQuestNodeResponse>('/complete-quest-node', {
      nodeId,
      roundId,
      ...(questRunId ? { questRunId } : {}),
    }),
}
