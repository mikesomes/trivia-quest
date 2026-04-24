import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { parseBody } from '../_shared/validation.ts'
import { SHOP_ITEMS, type ShopItemId } from '../_shared/types.ts'

interface PurchaseItemBody {
  itemId?: unknown
  quantity?: unknown
}

const VALID_ITEM_IDS = SHOP_ITEMS.map((i) => i.id)

function isValidItemId(value: unknown): value is ShopItemId {
  return typeof value === 'string' && (VALID_ITEM_IDS as string[]).includes(value)
}

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<PurchaseItemBody>(req)
  if (body instanceof Response) return body

  if (!isValidItemId(body.itemId)) return errorResponse('Invalid itemId', 400)
  if (typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 4) {
    return errorResponse('quantity must be an integer between 1 and 4', 400)
  }

  const itemDef = SHOP_ITEMS.find((i) => i.id === body.itemId)!
  const totalCost = itemDef.cost * body.quantity

  const supabase = createServiceClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('coins, inventory_lives, inventory_hammers, inventory_shields, inventory_xp_booster')
    .eq('id', auth.userId)
    .single()

  if (userError || !user) return errorResponse('Failed to fetch user', 500)

  const currentCoins: number = user.coins ?? 0
  if (currentCoins < totalCost) {
    return errorResponse('Insufficient coins', 402)
  }

  const inventoryKey = itemDef.inventoryKey as keyof typeof user
  const currentCount: number = (user[inventoryKey] as number) ?? 0
  if (currentCount + body.quantity > itemDef.maxInventory) {
    return errorResponse(
      `Cannot hold more than ${itemDef.maxInventory} of this item`,
      400
    )
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({
      coins: currentCoins - totalCost,
      [itemDef.inventoryKey]: currentCount + body.quantity,
    })
    .eq('id', auth.userId)

  if (updateError) return errorResponse('Failed to complete purchase', 500)

  return jsonResponse({
    success: true,
    coinsRemaining: currentCoins - totalCost,
    newInventoryCount: currentCount + body.quantity,
  })
})
