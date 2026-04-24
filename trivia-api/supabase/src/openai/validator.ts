import type { QuestionOutput } from './schema.ts'
import { QuestionBatchOutputSchema } from './schema.ts'

export interface ValidationResult {
  valid: QuestionOutput[]
  rejected: Array<{ question: Partial<QuestionOutput>; reason: string }>
}

const STUB_PATTERNS = [
  /^question \d+/i,
  /^n\/a$/i,
  /^placeholder/i,
  /^\[.*\]$/,
]

const DISALLOWED_CONTENT_PATTERNS = [
  /\bwtf\b/i,
]

export function validateBatch(rawJson: string): ValidationResult {
  const valid: QuestionOutput[] = []
  const rejected: ValidationResult['rejected'] = []

  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return { valid: [], rejected: [{ question: {}, reason: 'Invalid JSON' }] }
  }

  const result = QuestionBatchOutputSchema.safeParse(parsed)
  if (!result.success) {
    return { valid: [], rejected: [{ question: {}, reason: 'Schema validation failed: ' + result.error.message }] }
  }

  for (const q of result.data.questions) {
    const rejection = validateQuestion(q)
    if (rejection) {
      rejected.push({ question: q, reason: rejection })
    } else {
      valid.push(q)
    }
  }

  return { valid, rejected }
}

function validateQuestion(q: QuestionOutput): string | null {
  // Check for stub/placeholder text
  for (const pattern of STUB_PATTERNS) {
    if (pattern.test(q.questionText)) {
      return `Question text looks like a stub: "${q.questionText}"`
    }
  }

  const searchableText = [
    q.questionText,
    q.optionA,
    q.optionB,
    q.optionC,
    q.optionD,
    q.explanation,
  ].join(' ')

  for (const pattern of DISALLOWED_CONTENT_PATTERNS) {
    if (pattern.test(searchableText)) {
      return 'Question contains disallowed profanity or slang'
    }
  }

  // Check all 4 options are distinct (case-insensitive)
  const options = [q.optionA, q.optionB, q.optionC, q.optionD].map(o => o.toLowerCase().trim())
  const uniqueOptions = new Set(options)
  if (uniqueOptions.size < 4) {
    return 'Duplicate answer options detected'
  }

  // Check no option is a substring of another
  const optionArr = Array.from(uniqueOptions)
  for (let i = 0; i < optionArr.length; i++) {
    for (let j = 0; j < optionArr.length; j++) {
      if (i !== j && optionArr[i].length > 3 && optionArr[j].includes(optionArr[i])) {
        return `Option "${optionArr[i]}" is a substring of another option`
      }
    }
  }

  // Get the correct answer text
  const optionMap: Record<string, string> = {
    a: q.optionA.toLowerCase().trim(),
    b: q.optionB.toLowerCase().trim(),
    c: q.optionC.toLowerCase().trim(),
    d: q.optionD.toLowerCase().trim(),
  }
  const correctText = optionMap[q.correctOption]

  // Check question text doesn't contain the exact correct answer
  if (correctText.length > 4 && q.questionText.toLowerCase().includes(correctText)) {
    return 'Question text contains the correct answer verbatim'
  }

  // Check explanation exists and isn't empty
  if (!q.explanation || q.explanation.trim().length < 10) {
    return 'Explanation is missing or too short'
  }

  return null
}
