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

/** Questions requested per bucket per top-up run. */
const DEFAULT_TOPUP_COUNT = 15

// Keeps the existing three gameplay buckets while giving later coverage planning
// a stable 1–10 signal. Editorial review may refine this before promotion.
const DIFFICULTY_RATING: Record<string, number> = { easy: 3, medium: 6, hard: 9 }

function toCandidateRows(questions: Awaited<ReturnType<typeof generateQuestions>>, generationBatchId: string) {
  return questions.map(question => {
    const choices = [question.option_a, question.option_b, question.option_c, question.option_d]
    const correctAnswerIndex = question.correct_option.charCodeAt(0) - 'a'.charCodeAt(0)
    return {
      category: question.category,
      difficulty: question.difficulty,
      difficulty_rating: DIFFICULTY_RATING[question.difficulty],
      question_text: question.question_text,
      choices,
      correct_answer_index: correctAnswerIndex,
      correct_answer: choices[correctAnswerIndex],
      explanation: question.explanation,
      tags: [],
      generation_batch_id: generationBatchId,
      generator_model: question.source,
    }
  })
}

async function stageCandidates(
  supabase: ReturnType<typeof createServiceClient>,
  questions: Awaited<ReturnType<typeof generateQuestions>>,
  generationBatchId = crypto.randomUUID(),
) {
  if (questions.length === 0) return generationBatchId
  const { error } = await supabase.from('question_candidates').insert(toCandidateRows(questions, generationBatchId))
  if (error) throw new Error(`Failed to stage question candidates: ${error.message}`)
  return generationBatchId
}

/**
 * Read a positive integer from the environment, falling back to a default.
 *
 * README.md has documented QUESTION_BANK_MIN_THRESHOLD and
 * QUESTION_BANK_TOPUP_COUNT as tunable since the beginning, and both sit in
 * .env.local, but no code ever read them — the values were hardcoded. Raising
 * the documented knob did nothing. They are honoured now, so the bank floor and
 * batch size can be adjusted for cost without a redeploy.
 */
function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Bind the near-duplicate RPC to a category. Injected into the generator so it
 * stays free of a database dependency.
 */
function bankDuplicateFinder(
  supabase: ReturnType<typeof createServiceClient>,
  category: string
) {
  return async (candidates: Array<{ idx: number; text: string; answer: string }>) => {
    const { data, error } = await supabase.rpc('check_question_duplicates', {
      p_category: category,
      p_candidates: candidates,
    })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: { idx: number; match_text: string; score: number }) => ({
      idx: row.idx,
      matchText: row.match_text,
      score: row.score,
    }))
  }
}

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
    const minPerBucket = envInt('QUESTION_BANK_MIN_THRESHOLD', GAME_CONSTANTS.QUESTION_BANK_MIN)
    const topUpCount = envInt('QUESTION_BANK_TOPUP_COUNT', DEFAULT_TOPUP_COUNT)
    const inventory = await getQuestionInventory(supabase)

    // Collect all buckets that need topping up
    const bucketsToFill: Array<{ cat: string; diff: string }> = []
    for (const cat of CATEGORIES) {
      for (const diff of DIFFICULTIES) {
        const existing = inventory.find(i => i.category === cat && i.difficulty === diff)
        const currentCount = existing?.count ?? 0
        if (currentCount < minPerBucket) {
          bucketsToFill.push({ cat, diff })
        }
      }
    }

    log.info('Starting topUpAll', { bucketsToFill: bucketsToFill.length, minPerBucket, topUpCount })

    // Process up to 4 buckets concurrently to avoid OpenAI rate limits
    const tasks = bucketsToFill.map(({ cat, diff }) => async () => {
      const needed = topUpCount
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
          findBankDuplicates: bankDuplicateFinder(supabase, cat),
          openaiChat: (params) => openai.chat({ ...params, model: modelOverride }),
        })
        const generationBatchId = await stageCandidates(supabase, questions)
        return { category: cat, difficulty: diff, staged: questions.length, generationBatchId }
      } catch (err) {
        log.error('Bucket generation failed', { category: cat, difficulty: diff, error: String(err) })
        return { category: cat, difficulty: diff, staged: 0, errors: String(err) }
      }
    })

    const results = await withConcurrency(tasks, 4)
    log.timed('topUpAll complete', start, { buckets: results.length, totalStaged: results.reduce((s, r) => s + r.staged, 0) })

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
    findBankDuplicates: bankDuplicateFinder(supabase, body.category),
    openaiChat: (params) => openai.chat({ ...params, model: modelOverride }),
  })

  if (questions.length === 0) {
    log.warn('No valid questions generated', { category: body.category, difficulty: body.difficulty })
    return errorResponse('Failed to generate any valid questions', 500)
  }

  let generationBatchId: string
  try {
    generationBatchId = await stageCandidates(supabase, questions)
  } catch (err) {
    log.error('Candidate staging failed', { error: String(err) })
    return errorResponse(`Failed to stage question candidates: ${String(err)}`, 500)
  }

  log.timed('Questions generated and staged', start, { staged: questions.length })

  return jsonResponse({
    staged: questions.length,
    category: body.category,
    difficulty: body.difficulty,
    generationBatchId,
  })
})
