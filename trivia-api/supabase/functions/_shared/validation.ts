// Request body validation helpers using manual checks (no npm Zod in Deno edge functions)
// For unit tests (Node), see src/openai/schema.ts which uses Zod

import type { Category, Difficulty } from './types.ts'
import { CATEGORIES, DIFFICULTIES } from './types.ts'
import { errorResponse } from './errors.ts'

export function isValidCategory(value: unknown): value is Category {
  return typeof value === 'string' && CATEGORIES.includes(value as Category)
}

export function isValidDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFFICULTIES.includes(value as Difficulty)
}

export function isValidUUID(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

export function isValidOption(value: unknown): value is 'a' | 'b' | 'c' | 'd' {
  return typeof value === 'string' && ['a', 'b', 'c', 'd'].includes(value)
}

export async function parseBody<T>(req: Request): Promise<T | Response> {
  try {
    const body = await req.json()
    return body as T
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
}
