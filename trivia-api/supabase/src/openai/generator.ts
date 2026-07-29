// NOTE: This file is designed to be called from the generate-questions Edge Function.
// It uses dynamic imports to stay compatible with both Node (tests) and Deno (runtime).

import type { Category, Difficulty } from '../../functions/_shared/types.ts'
import { buildUserPrompt, SYSTEM_PROMPT } from './prompts.ts'
import { validateBatch } from './validator.ts'
import { computeContentHash, deduplicateQuestions, dropNearDuplicatesWithinBatch } from './deduplicator.ts'
import type { QuestionOutput } from './schema.ts'
import { OPENAI_QUESTION_JSON_SCHEMA } from './schema.ts'
import { verifyQuestions } from './verifier.ts'

// Categories where LLM recall is less reliable — run a verification pass and request more upfront
const VERIFICATION_CATEGORIES: Category[] = ['harry_potter', 'famous_quotes']

/**
 * Model name for the `source` column.
 *
 * Read through globalThis deliberately. `Deno?.env` looks defensive but throws
 * ReferenceError under Node, because optional chaining guards a null value, not
 * an undeclared identifier — which made this module impossible to exercise from
 * the test runner despite the header above.
 */
function sourceModel(): string {
  const denoEnv = (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } }).Deno
  return denoEnv?.env?.get?.('OPENAI_MODEL') || 'gpt-4o-mini'
}

export interface GenerateQuestionsOptions {
  category: Category
  difficulty: Difficulty
  count: number
  /** Exact-match dedup keys for questions already in the bank. */
  existingHashes?: Set<string>
  /** Sample of bank question text, quoted into the prompt so the model can steer clear of it. */
  existingQuestions?: string[]
  openaiChat: (params: {
    systemPrompt: string
    userPrompt: string
    jsonSchema: Record<string, unknown>
    schemaName: string
    model?: string
    temperature?: number
  }) => Promise<string>
  /**
   * Near-duplicate check against the bank, injected so this module stays
   * testable without a database. Returns the indexes to reject. Omit it and the
   * within-batch pass still runs.
   */
  findBankDuplicates?: (
    candidates: Array<{ idx: number; text: string; answer: string }>
  ) => Promise<Array<{ idx: number; matchText: string; score: number }>>
}

export interface GeneratedQuestion {
  category: Category
  difficulty: Difficulty
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  explanation: string
  content_hash: string
  source: string
}

/**
 * Reject candidates that duplicate something already in the bank.
 *
 * Fails open: a transient database error should cost a few near-duplicates, not
 * the whole generated batch. The audit script is what catches anything that
 * slips through here.
 */
async function rejectBankDuplicates<T extends QuestionOutput>(
  questions: T[],
  findBankDuplicates: GenerateQuestionsOptions['findBankDuplicates']
): Promise<T[]> {
  if (!findBankDuplicates || questions.length === 0) return questions

  const optionMap = { a: 'optionA', b: 'optionB', c: 'optionC', d: 'optionD' } as const
  const candidates = questions.map((q, idx) => ({
    idx,
    text: q.questionText,
    answer: q[optionMap[q.correctOption]] ?? '',
  }))

  try {
    const matches = await findBankDuplicates(candidates)
    if (matches.length === 0) return questions

    const rejected = new Set(matches.map(m => m.idx))
    for (const match of matches) {
      console.warn(
        `[generator] Dropped bank near-duplicate (${match.score.toFixed(2)}): ` +
        `"${questions[match.idx]?.questionText}" ~ "${match.matchText}"`
      )
    }
    return questions.filter((_, idx) => !rejected.has(idx))
  } catch (err) {
    console.warn('[generator] Bank duplicate check failed, keeping batch:', err)
    return questions
  }
}

export async function generateQuestions(
  opts: GenerateQuestionsOptions
): Promise<GeneratedQuestion[]> {
  const {
    category,
    difficulty,
    count,
    existingHashes = new Set(),
    existingQuestions = [],
    openaiChat,
    findBankDuplicates,
  } = opts

  const needsVerification = VERIFICATION_CATEGORIES.includes(category)
  // Request more upfront for categories that go through verification (expect ~30-40% rejection rate)
  const batchSize = needsVerification
    ? Math.ceil(count * 2) + 2
    : Math.ceil(count * 1.3) + 2

  const attemptGeneration = async (
    diversityBoost = false,
    alreadyGenerated: string[] = [],
  ): Promise<GeneratedQuestion[]> => {
    const systemPrompt = diversityBoost
      ? SYSTEM_PROMPT + '\n\nIMPORTANT: Generate highly diverse questions. Avoid common facts and well-known trivia.'
      : SYSTEM_PROMPT

    const rawJson = await openaiChat({
      systemPrompt,
      // The retry also excludes what attempt 1 produced. Those rows are not in
      // the bank yet, so without this the retry is free to write them again and
      // the only thing standing between it and a wasted call is the hash check.
      userPrompt: buildUserPrompt(category, difficulty, batchSize, [
        ...alreadyGenerated,
        ...existingQuestions,
      ]),
      jsonSchema: OPENAI_QUESTION_JSON_SCHEMA,
      schemaName: 'trivia_questions',
    })

    const { valid, rejected } = validateBatch(rawJson)
    if (rejected.length > 0) {
      console.warn(`[generator] Rejected ${rejected.length} questions:`, rejected.map(r => r.reason))
    }

    const { unique, duplicates } = deduplicateQuestions(valid, existingHashes)
    if (duplicates.length > 0) {
      console.warn(`[generator] Deduped ${duplicates.length} exact duplicates`)
    }

    // Near-duplicate passes run before verification so the expensive
    // fact-checking call is not spent on questions about to be thrown away.
    const { unique: batchUnique, nearDuplicates } = dropNearDuplicatesWithinBatch(unique)
    for (const pair of nearDuplicates) {
      console.warn(
        `[generator] Dropped in-batch near-duplicate (${pair.score.toFixed(2)}): ` +
        `"${pair.dropped.questionText}" ~ "${pair.kept.questionText}"`
      )
    }

    const bankUnique = await rejectBankDuplicates(batchUnique, findBankDuplicates)

    const verified = needsVerification
      ? await verifyQuestions(bankUnique, category, openaiChat)
      : bankUnique

    return verified.map(q => ({
      category,
      difficulty,
      question_text: q.questionText,
      option_a: q.optionA,
      option_b: q.optionB,
      option_c: q.optionC,
      option_d: q.optionD,
      correct_option: q.correctOption,
      explanation: q.explanation,
      content_hash: q.contentHash,
      source: `openai-${sourceModel()}`,
    }))
  }

  // Attempt 1
  let results = await attemptGeneration(false)

  // If we got fewer than the minimum acceptable, retry with diversity boost
  const minAcceptable = Math.max(3, Math.floor(count * 0.7))
  if (results.length < minAcceptable) {
    console.warn(`[generator] First attempt got ${results.length}/${count}, retrying with diversity boost`)
    const retryResults = await attemptGeneration(true, results.map(r => r.question_text))
    // Combine unique results from both attempts
    const combinedHashes = new Set([...existingHashes, ...results.map(r => r.content_hash)])
    const { unique: additionalUnique } = deduplicateQuestions(
      retryResults.map(r => ({
        questionText: r.question_text,
        optionA: r.option_a,
        optionB: r.option_b,
        optionC: r.option_c,
        optionD: r.option_d,
        correctOption: r.correct_option as 'a' | 'b' | 'c' | 'd',
        explanation: r.explanation,
      })),
      combinedHashes
    )
    results = [...results, ...additionalUnique.map(q => ({
      category,
      difficulty,
      question_text: q.questionText,
      option_a: q.optionA,
      option_b: q.optionB,
      option_c: q.optionC,
      option_d: q.optionD,
      correct_option: q.correctOption,
      explanation: q.explanation,
      content_hash: q.contentHash,
      source: `openai-${sourceModel()}`,
    }))]
  }

  return results.slice(0, count)
}
