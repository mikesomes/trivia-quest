import { apiPost } from './client'
import type { PurchaseItemRequest, PurchaseItemResponse, EquipItemsRequest, EquipItemsResponse } from '../types/api'

export const shopApi = {
  purchase: (req: PurchaseItemRequest) =>
    apiPost<PurchaseItemResponse>('/purchase-item', req),
  equip: (req: EquipItemsRequest) =>
    apiPost<EquipItemsResponse>('/equip-items', req),
}
