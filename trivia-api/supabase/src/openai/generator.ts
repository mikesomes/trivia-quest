// NOTE: This file is designed to be called from the generate-questions Edge Function.
// It uses dynamic imports to stay compatible with both Node (tests) and Deno (runtime).

import type { Category, Difficulty } from '../../functions/_shared/types.ts'
import { buildUserPrompt, SYSTEM_PROMPT } from './prompts.ts'
import { validateBatch } from './validator.ts'
import { computeContentHash, deduplicateQuestions } from './deduplicator.ts'
import { OPENAI_QUESTION_JSON_SCHEMA } from './schema.ts'

export interface GenerateQuestionsOptions {
  category: Category
  difficulty: Difficulty
  count: number
  existingHashes?: Set<string>
  openaiChat: (params: {
    systemPrompt: string
    userPrompt: string
    jsonSchema: Record<string, unknown>
    schemaName: string
  }) => Promise<string>
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

export async function generateQuestions(
  opts: GenerateQuestionsOptions
): Promise<GeneratedQuestion[]> {
  const { category, difficulty, count, existingHashes = new Set(), openaiChat } = opts

  // Request slightly more than needed to account for validation failures
  const batchSize = Math.ceil(count * 1.3) + 2
  const recentHashSamples = Array.from(existingHashes).slice(0, 20).map(h => h.substring(0, 16))

  const attemptGeneration = async (diversityBoost = false): Promise<GeneratedQuestion[]> => {
    const systemPrompt = diversityBoost
      ? SYSTEM_PROMPT + '\n\nIMPORTANT: Generate highly diverse questions. Avoid common facts and well-known trivia.'
      : SYSTEM_PROMPT

    const rawJson = await openaiChat({
      systemPrompt,
      userPrompt: buildUserPrompt(category, difficulty, batchSize, recentHashSamples),
      jsonSchema: OPENAI_QUESTION_JSON_SCHEMA,
      schemaName: 'trivia_questions',
    })

    const { valid, rejected } = validateBatch(rawJson)
    if (rejected.length > 0) {
      console.warn(`[generator] Rejected ${rejected.length} questions:`, rejected.map(r => r.reason))
    }

    const { unique, duplicates } = deduplicateQuestions(valid, existingHashes)
    if (duplicates.length > 0) {
      console.warn(`[generator] Deduped ${duplicates.length} duplicate questions`)
    }

    return unique.map(q => ({
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
      source: `openai-${Deno?.env?.get?.('OPENAI_MODEL') || 'gpt-4o-mini'}`,
    }))
  }

  // Attempt 1
  let results = await attemptGeneration(false)

  // If we got fewer than the minimum acceptable, retry with diversity boost
  const minAcceptable = Math.max(3, Math.floor(count * 0.7))
  if (results.length < minAcceptable) {
    console.warn(`[generator] First attempt got ${results.length}/${count}, retrying with diversity boost`)
    const retryResults = await attemptGeneration(true)
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
      source: `openai-${Deno?.env?.get?.('OPENAI_MODEL') || 'gpt-4o-mini'}`,
    }))]
  }

  return results.slice(0, count)
}
