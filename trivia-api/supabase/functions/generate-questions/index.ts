import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidCategory, isValidDifficulty, parseBody } from '../_shared/validation.ts'
import { createOpenAIClient } from '../_shared/openaiClient.ts'
import { CATEGORIES, DIFFICULTIES, GAME_CONSTANTS } from '../_shared/types.ts'
import type { Category } from '../_shared/types.ts'
import { getExistingHashes, getQuestionInventory, getRecentQuestionTexts } from '../../src/db/questions.ts'
import { generateQuestions } from '../../src/openai/generator.ts'
import { MAX_EXCLUSIONS } from '../../src/openai/prompts.ts'
import { makeLogger, getRequestId } from '../_shared/logger.ts'

// Use a more capable model for categories where factual accuracy is harder to get right
const CATEGORY_MODEL_OVERRIDE: Partial<Record<Category, string>> = {}

/** Run tasks with at most `concurrency` running simultaneously. */
async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = []
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const taskIndex = index++
      results[taskIndex] = await tasks[taskIndex]()
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
  return results
}

Deno.serve(async (req) => {
  const requestId = getRequestId(req)
  const log = makeLogger('generate-questions', requestId)

  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  // Validate cron/admin secret
  const cronSecret = Deno.env.get('CRON_SECRET')
  const authHeader = req.headers.get('Authorization')
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`

  // Also allow service role key for manual triggering
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const isServiceCall = serviceKey && authHeader === `Bearer ${serviceKey}`

  if (!isCronCall && !isServiceCall) {
    return errorResponse('Unauthorized', 401)
  }

  const supabase = createServiceClient()
  const openai = createOpenAIClient()

  const body = await parseBody<{
    category?: unknown
    difficulty?: unknown
    count?: unknown
    topUpAll?: unknown
  }>(req)
  if (body instanceof Response) return body

  // Top-up mode: check all buckets and fill those below threshold
  if (body.topUpAll === true) {
    const start = Date.now()
    const inventory = await getQuestionInventory(supabase)

    // Collect all buckets that need topping up
    const bucketsToFill: Array<{ cat: string; diff: string }> = []
    for (const cat of CATEGORIES) {
      for (const diff of DIFFICULTIES) {
        const existing = inventory.find(i => i.category === cat && i.difficulty === diff)
        const currentCount = existing?.count ?? 0
        if (currentCount < GAME_CONSTANTS.QUESTION_BANK_MIN) {
          bucketsToFill.push({ cat, diff })
        }
      }
    }

    log.info('Starting topUpAll', { bucketsToFill: bucketsToFill.length })

    // Process up to 4 buckets concurrently to avoid OpenAI rate limits
    const tasks = bucketsToFill.map(({ cat, diff }) => async () => {
      const needed = 15
      try {
        const crossCats = cat === 'general_knowledge'
          ? ['history', 'science', 'geography', 'sports', 'movies_tv']
          : []
        const [hashes, existingQuestions] = await Promise.all([
          getExistingHashes(supabase, cat, diff, crossCats),
          getRecentQuestionTexts(supabase, cat, diff, MAX_EXCLUSIONS, crossCats),
        ])
        const modelOverride = CATEGORY_MODEL_OVERRIDE[cat as Category]
        const questions = await generateQuestions({
          category: cat,
          difficulty: diff,
          count: needed,
          existingHashes: hashes,
          existingQuestions,
          openaiChat: (params) => openai.chat({ ...params, model: modelOverride }),
        })
        if (questions.length > 0) {
          await supabase.from('question_bank').upsert(questions, { onConflict: 'content_hash', ignoreDuplicates: true })
        }
        return { category: cat, difficulty: diff, generated: questions.length }
      } catch (err) {
        log.error('Bucket generation failed', { category: cat, difficulty: diff, error: String(err) })
        return { category: cat, difficulty: diff, generated: 0, errors: String(err) }
      }
    })

    const results = await withConcurrency(tasks, 4)
    log.timed('topUpAll complete', start, { buckets: results.length, totalGenerated: results.reduce((s, r) => s + r.generated, 0) })

    return jsonResponse({ mode: 'topUpAll', results })
  }

  // Single category/difficulty generation
  if (!isValidCategory(body.category)) return errorResponse('Invalid category', 400)
  if (!isValidDifficulty(body.difficulty)) return errorResponse('Invalid difficulty', 400)

  const count = typeof body.count === 'number' ? Math.min(body.count, 50) : 15

  // For general_knowledge, also load hashes from the overlapping categories to prevent cross-category duplication
  const crossCategories = body.category === 'general_knowledge'
    ? ['history', 'science', 'geography', 'sports', 'movies_tv']
    : []

  const start = Date.now()
  log.info('Generating questions', { category: body.category, difficulty: body.difficulty, count })

  const [existingHashes, existingQuestions] = await Promise.all([
    getExistingHashes(supabase, body.category, body.difficulty, crossCategories),
    getRecentQuestionTexts(supabase, body.category, body.difficulty, MAX_EXCLUSIONS, crossCategories),
  ])
  const modelOverride = CATEGORY_MODEL_OVERRIDE[body.category]
  const questions = await generateQuestions({
    category: body.category,
    difficulty: body.difficulty,
    count,
    existingHashes,
    existingQuestions,
    openaiChat: (params) => openai.chat({ ...params, model: modelOverride }),
  })

  if (questions.length === 0) {
    log.warn('No valid questions generated', { category: body.category, difficulty: body.difficulty })
    return errorResponse('Failed to generate any valid questions', 500)
  }

  const { error: insertError } = await supabase.from('question_bank').upsert(questions, { onConflict: 'content_hash', ignoreDuplicates: true })
  if (insertError) {
    log.error('Insert failed', { error: insertError.message })
    return errorResponse(`Failed to insert questions: ${insertError.message}`, 500)
  }

  log.timed('Questions generated and saved', start, { generated: questions.length })

  return jsonResponse({
    generated: questions.length,
    category: body.category,
    difficulty: body.difficulty,
  })
})
