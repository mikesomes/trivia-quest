/**
 * Decide whether two questions that share a correct answer are the same
 * question, or different questions that happen to land on the same answer.
 *
 * The lexical rule cannot make this call. A shared normalized answer plus high
 * trigram similarity is strong evidence candidate-to-bank, where one new
 * question is checked against the bank. Applied bank-to-bank it produces a
 * false-positive class the generator never hit: a question template filled with
 * different subjects that resolve to one answer.
 *
 *   "With which sport is Serena Williams associated?"   -> tennis
 *   "With which sport is Billie Jean King associated?"  -> tennis     0.554
 *
 * against a genuine duplicate scoring no higher:
 *
 *   "Who is known as the 'Queen of Soul'?"              -> Aretha Franklin
 *   "Who is considered the 'Queen of Soul'?"            -> Aretha Franklin  0.556
 *
 * The two populations overlap in score, so no threshold separates them. What
 * separates them is whether the questions are *about* the same thing, which is
 * a judgement call — so it is asked as one.
 */

export interface AdjudicationInput {
  category: string
  answer: string
  textA: string
  textB: string
}

export interface AdjudicationResult {
  /** True only when a player would experience these as the same question repeated. */
  duplicate: boolean
  confidence: number
  reason: string
}

export const DUPLICATE_ADJUDICATION_SCHEMA = {
  type: 'object',
  properties: {
    duplicate: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reason: { type: 'string' },
  },
  required: ['duplicate', 'confidence', 'reason'],
  additionalProperties: false,
}

export const DUPLICATE_ADJUDICATION_SYSTEM_PROMPT =
  'You judge whether two multiple-choice trivia questions are redundant with each other. ' +
  'Both questions below have the same correct answer; that is already established and is not what you are being asked. ' +
  'Return JSON matching the supplied schema.'

export function buildAdjudicationPrompt(input: AdjudicationInput): string {
  return `Category: ${input.category}
Both questions have the correct answer: ${input.answer}

Question A: ${input.textA}
Question B: ${input.textB}

Are these the same question asked twice, or two different questions that happen to share an answer?

Answer "duplicate": true only if they ask about the same underlying subject or fact, so that a player served both would feel the game repeated itself. Rewording, added or removed qualifiers, and different levels of detail about the same subject are all duplicates.

Answer "duplicate": false if each question is about a different subject, person, work, place or event, even though the answer is the same. Two questions built from the same template with different subjects are NOT duplicates.

Examples of duplicate: true
- "Who painted the Mona Lisa?" / "Which artist painted the Mona Lisa?" — same subject, reworded.
- "Who developed the polio vaccine?" / "Who developed the first successful polio vaccine in the 1950s?" — same subject, one is more specific.

Examples of duplicate: false
- "With which sport is Serena Williams associated?" / "With which sport is Billie Jean King associated?" — different people, both answer tennis.
- "In which book series does 'Prince Caspian' appear?" / "In which book series does 'Lucy Pevensie' appear?" — different characters, both answer Narnia.
- "Who painted the Mona Lisa?" / "Which artist painted 'The Last Supper'?" — different works, both answer Leonardo da Vinci.`
}

export function parseAdjudication(rawJson: string): AdjudicationResult {
  const parsed = JSON.parse(rawJson) as Partial<AdjudicationResult>
  if (typeof parsed.duplicate !== 'boolean') {
    throw new Error('Duplicate adjudication returned an invalid duplicate flag')
  }
  if (
    typeof parsed.confidence !== 'number' ||
    !Number.isFinite(parsed.confidence) ||
    parsed.confidence < 0 ||
    parsed.confidence > 1
  ) {
    throw new Error('Duplicate adjudication returned an invalid confidence')
  }
  if (typeof parsed.reason !== 'string') throw new Error('Duplicate adjudication returned an invalid reason')
  return parsed as AdjudicationResult
}

/**
 * Same dependency-injected shape as blindReviewQuestion, so this runs against
 * the Edge client in a function or a plain fetch wrapper in a script.
 */
export async function adjudicateDuplicate(
  input: AdjudicationInput,
  openaiChat: (params: {
    systemPrompt: string
    userPrompt: string
    jsonSchema: Record<string, unknown>
    schemaName: string
    temperature?: number
  }) => Promise<string>
): Promise<AdjudicationResult> {
  const rawJson = await openaiChat({
    systemPrompt: DUPLICATE_ADJUDICATION_SYSTEM_PROMPT,
    userPrompt: buildAdjudicationPrompt(input),
    jsonSchema: DUPLICATE_ADJUDICATION_SCHEMA,
    schemaName: 'trivia_duplicate_adjudication',
    temperature: 0,
  })
  return parseAdjudication(rawJson)
}

/**
 * A pair is only removed on a confident yes. An unparseable response, an API
 * failure or a hedged answer leaves both questions in the bank: the cost of
 * keeping a duplicate is that the audit surfaces it again, while the cost of a
 * wrong drop is a good question silently gone.
 */
export const ADJUDICATION_CONFIDENCE_FLOOR = 0.7

export function confirmsDuplicate(result: AdjudicationResult): boolean {
  return result.duplicate && result.confidence >= ADJUDICATION_CONFIDENCE_FLOOR
}
