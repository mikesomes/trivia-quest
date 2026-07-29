import type { Category } from '../../functions/_shared/types.ts'
import type { QuestionOutput } from './schema.ts'

interface VerificationResult {
  index: number
  verdict: 'keep' | 'reject'
  reason: string
}

const VERIFIER_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        required: ['index', 'verdict', 'reason'],
        properties: {
          index: { type: 'number' },
          verdict: { type: 'string', enum: ['keep', 'reject'] },
          reason: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
}

const CATEGORY_DISPLAY: Partial<Record<Category, string>> = {
  harry_potter: 'Harry Potter',
  famous_quotes: 'Famous Quotes',
}

// Generic because this only ever filters: whatever the caller passes in comes
// back out unchanged. Typing it as QuestionOutput[] silently discarded the
// contentHash that deduplicateQuestions had already attached.
export async function verifyQuestions<T extends QuestionOutput>(
  questions: T[],
  category: Category,
  openaiChat: (params: {
    systemPrompt: string
    userPrompt: string
    jsonSchema: Record<string, unknown>
    schemaName: string
    temperature?: number
  }) => Promise<string>
): Promise<T[]> {
  if (questions.length === 0) return []

  const categoryLabel = CATEGORY_DISPLAY[category] ?? category
  const optionMap = { a: 'optionA', b: 'optionB', c: 'optionC', d: 'optionD' } as const

  const questionList = questions
    .map((q, i) => {
      const correctText = q[optionMap[q.correctOption]]
      return `[${i}] Q: ${q.questionText}\n    Correct answer: ${correctText}\n    Explanation: ${q.explanation}`
    })
    .join('\n\n')

  const systemPrompt = `You are a strict ${categoryLabel} fact-checker. Your job is to verify trivia questions for factual accuracy. Be conservative: if you have any doubt about a question's correct answer, reject it.`

  const userPrompt = `Review each trivia question below. For each one, respond with verdict "keep" only if you are 100% certain the stated correct answer is accurate and unambiguous. Respond "reject" if the answer is wrong, potentially wrong, ambiguous, or if you are not sure.

${questionList}

Respond with a JSON object mapping each question index to its verdict and a brief reason.`

  try {
    const rawJson = await openaiChat({
      systemPrompt,
      userPrompt,
      jsonSchema: VERIFIER_SCHEMA,
      schemaName: 'question_verification',
      temperature: 0,
    })

    const parsed = JSON.parse(rawJson) as { results: VerificationResult[] }
    const resultsByIndex = new Map(parsed.results.map(r => [r.index, r]))

    const kept: T[] = []
    const rejected: Array<{ index: number; reason: string }> = []

    for (let i = 0; i < questions.length; i++) {
      const result = resultsByIndex.get(i)
      if (!result || result.verdict === 'keep') {
        kept.push(questions[i])
      } else {
        rejected.push({ index: i, reason: result.reason })
      }
    }

    if (rejected.length > 0) {
      console.warn(`[verifier] Rejected ${rejected.length}/${questions.length} questions:`, rejected)
    }

    return kept
  } catch (err) {
    // If verification fails entirely, pass all questions through rather than losing the batch
    console.warn('[verifier] Verification failed, passing all questions through:', err)
    return questions
  }
}
