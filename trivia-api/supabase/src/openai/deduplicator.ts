import { createHash } from 'node:crypto'
import type { QuestionOutput } from './schema.ts'
import { NEAR_DUPLICATE_THRESHOLD, answerKey, similarity, trigrams } from './similarity.ts'

/**
 * Compute a content hash for deduplication.
 * Hash is based on normalized question text + correct answer text.
 */
export function computeContentHash(q: QuestionOutput): string {
  const optionMap: Record<string, string> = {
    a: q.optionA,
    b: q.optionB,
    c: q.optionC,
    d: q.optionD,
  }
  const correctAnswer = optionMap[q.correctOption]

  const normalized = [q.questionText, correctAnswer]
    .join('|')
    .toLowerCase()
    .replace(/[^\w\s|]/g, '') // strip punctuation except pipe separator
    .replace(/\s+/g, ' ')
    .trim()

  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Filter out questions whose content hashes already exist in the DB.
 * @param questions - validated questions to check
 * @param existingHashes - Set of hashes already in the question_bank
 */
export function deduplicateQuestions(
  questions: QuestionOutput[],
  existingHashes: Set<string>
): { unique: Array<QuestionOutput & { contentHash: string }>; duplicates: QuestionOutput[] } {
  const unique: Array<QuestionOutput & { contentHash: string }> = []
  const duplicates: QuestionOutput[] = []
  const seenInBatch = new Set<string>()

  for (const q of questions) {
    const hash = computeContentHash(q)
    if (existingHashes.has(hash) || seenInBatch.has(hash)) {
      duplicates.push(q)
    } else {
      seenInBatch.add(hash)
      unique.push({ ...q, contentHash: hash })
    }
  }

  return { unique, duplicates }
}

export interface NearDuplicatePair<T> {
  kept: T
  dropped: T
  score: number
}

/**
 * Drop questions that duplicate an earlier question *in the same batch*.
 *
 * The bank-side check cannot see these — the batch has not been inserted yet —
 * and a single generation call routinely produces the same fact twice under two
 * phrasings, which the content hash lets straight through.
 *
 * Same rule as the SQL side: a shared correct answer is the gate, text
 * similarity is the confirmation. See NEAR_DUPLICATE_THRESHOLD for why
 * similarity alone is not usable.
 */
export function dropNearDuplicatesWithinBatch<T extends QuestionOutput>(
  questions: T[],
  threshold: number = NEAR_DUPLICATE_THRESHOLD
): { unique: T[]; nearDuplicates: Array<NearDuplicatePair<T>> } {
  const optionMap = { a: 'optionA', b: 'optionB', c: 'optionC', d: 'optionD' } as const

  const unique: T[] = []
  const nearDuplicates: Array<NearDuplicatePair<T>> = []
  // Keyed by normalized answer so only plausible collisions are ever scored.
  const keptByAnswer = new Map<string, Array<{ question: T; grams: Set<string> }>>()

  for (const question of questions) {
    const correct = question[optionMap[question.correctOption]]
    const key = answerKey(correct ?? '')
    const grams = trigrams(question.questionText)

    if (!key) {
      unique.push(question)
      continue
    }

    const peers = keptByAnswer.get(key) ?? []
    let collision: { question: T; score: number } | null = null

    for (const peer of peers) {
      const score = similarity(peer.grams, grams)
      if (score >= threshold && (!collision || score > collision.score)) {
        collision = { question: peer.question, score }
      }
    }

    if (collision) {
      nearDuplicates.push({ kept: collision.question, dropped: question, score: collision.score })
      continue
    }

    unique.push(question)
    peers.push({ question, grams })
    keptByAnswer.set(key, peers)
  }

  return { unique, nearDuplicates }
}
