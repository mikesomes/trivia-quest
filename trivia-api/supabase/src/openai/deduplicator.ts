import { createHash } from 'node:crypto'
import type { QuestionOutput } from './schema.ts'

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
