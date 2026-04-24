import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { parseBody } from '../_shared/validation.ts'

interface EquipItemsBody {
  equipped_lives?: unknown
  equipped_hammers?: unknown
  equipped_shields?: unknown
  equipped_xp_booster?: unknown
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
}

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<EquipItemsBody>(req)
  if (body instanceof Response) return body

  const { equipped_lives, equipped_hammers, equipped_shields, equipped_xp_booster } = body

  if (!isNonNegativeInt(equipped_lives))      return errorResponse('equipped_lives must be a non-negative integer', 400)
  if (!isNonNegativeInt(equipped_hammers))    return errorResponse('equipped_hammers must be a non-negative integer', 400)
  if (!isNonNegativeInt(equipped_shields))    return errorResponse('equipped_shields must be a non-negative integer', 400)
  if (!isNonNegativeInt(equipped_xp_booster)) return errorResponse('equipped_xp_booster must be a non-negative integer', 400)

  const supabase = createServiceClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('inventory_lives, inventory_hammers, inventory_shields, inventory_xp_booster')
    .eq('id', auth.userId)
    .single()

  if (userError || !user) return errorResponse('Failed to fetch user', 500)

  if (equipped_lives      > (user.inventory_lives      ?? 0)) return errorResponse('Cannot equip more lives than owned',      400)
  if (equipped_hammers    > (user.inventory_hammers    ?? 0)) return errorResponse('Cannot equip more hammers than owned',    400)
  if (equipped_shields    > (user.inventory_shields    ?? 0)) return errorResponse('Cannot equip more shields than owned',    400)
  if (equipped_xp_booster > (user.inventory_xp_booster ?? 0)) return errorResponse('Cannot equip more XP boosters than owned', 400)

  // Block equipping during an active round
  const { data: activeRound } = await supabase
    .from('rounds')
    .select('id')
    .eq('user_id', auth.userId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeRound) return errorResponse('Cannot change loadout during an active round', 409)

  const { error: updateError } = await supabase
    .from('users')
    .update({ equipped_lives, equipped_hammers, equipped_shields, equipped_xp_booster })
    .eq('id', auth.userId)

  if (updateError) return errorResponse('Failed to update loadout', 500)

  return jsonResponse({ equipped_lives, equipped_hammers, equipped_shields, equipped_xp_booster })
})
