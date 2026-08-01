export interface BlindReviewCandidate {
  id: string
  category: string
  question_text: string
  choices: [string, string, string, string]
  correct_answer_index: number
}

export interface BlindReviewResult {
  answer_index: 0 | 1 | 2 | 3
  confidence: number
  notes: string
}

export interface BlindReviewPatch {
  blind_review_answer_index: 0 | 1 | 2 | 3
  blind_review_matches: boolean
  reviewer_confidence: number
  blind_reviewer_notes: string
}

const BLIND_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    answer_index: { type: 'integer', enum: [0, 1, 2, 3] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    notes: { type: 'string' },
  },
  required: ['answer_index', 'confidence', 'notes'],
  additionalProperties: false,
}

export function buildBlindReviewPrompt(candidate: Pick<BlindReviewCandidate, 'category' | 'question_text' | 'choices'>): string {
  const choices = candidate.choices.map((choice, index) => `${index}. ${choice}`).join('\n')
  return `Answer this ${candidate.category} trivia question independently. Select the single best answer from the four choices. Do not assume that any answer is intended to be correct beyond what the question itself supports. If the question is ambiguous, subjective, time-sensitive, or has weak choices, still select the most defensible answer but lower your confidence and explain the concern briefly.

Question: ${candidate.question_text}
Choices:
${choices}`
}

function parseBlindReview(rawJson: string): BlindReviewResult {
  const parsed = JSON.parse(rawJson) as Partial<BlindReviewResult>
  if (!Number.isInteger(parsed.answer_index) || ![0, 1, 2, 3].includes(parsed.answer_index as number)) {
    throw new Error('AI blind review returned an invalid answer index')
  }
  if (typeof parsed.confidence !== 'number' || !Number.isFinite(parsed.confidence) || parsed.confidence < 0 || parsed.confidence > 1) {
    throw new Error('AI blind review returned an invalid confidence')
  }
  if (typeof parsed.notes !== 'string') throw new Error('AI blind review returned invalid notes')
  return parsed as BlindReviewResult
}

export async function blindReviewQuestion(
  candidate: BlindReviewCandidate,
  openaiChat: (params: {
    systemPrompt: string
    userPrompt: string
    jsonSchema: Record<string, unknown>
    schemaName: string
    temperature?: number
  }) => Promise<string>,
): Promise<BlindReviewResult> {
  const rawJson = await openaiChat({
    systemPrompt: 'You are an independent blind reviewer for multiple-choice trivia. Answer only from the question and choices provided. Return JSON matching the supplied schema. Do not claim to have seen an answer key.',
    userPrompt: buildBlindReviewPrompt(candidate),
    jsonSchema: BLIND_REVIEW_SCHEMA,
    schemaName: 'trivia_blind_review',
    temperature: 0,
  })
  return parseBlindReview(rawJson)
}

/** The stored-answer comparison is server controlled, not supplied by the model. */
export function makeBlindReviewPatch(result: BlindReviewResult, correctAnswerIndex: number): BlindReviewPatch {
  return {
    blind_review_answer_index: result.answer_index,
    blind_review_matches: result.answer_index === correctAnswerIndex,
    reviewer_confidence: result.confidence,
    blind_reviewer_notes: result.notes,
  }
}
