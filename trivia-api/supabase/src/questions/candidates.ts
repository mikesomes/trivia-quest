import { CATEGORIES, DIFFICULTIES } from '../../functions/_shared/types.ts'
import type { Category, Difficulty } from '../../functions/_shared/types.ts'

export type EditorialStatus = 'pending' | 'approved' | 'revise' | 'rejected'
export type VerificationStatus = 'unverified' | 'verified' | 'failed'

export interface QuestionCandidate {
  id: string
  category: Category
  subcategory: string | null
  difficulty: Exclude<Difficulty, 'boss'>
  difficulty_rating: number
  question_text: string
  choices: [string, string, string, string]
  correct_answer_index: 0 | 1 | 2 | 3
  correct_answer: string
  explanation: string | null
  tags: string[]
  generation_batch_id: string | null
  generator_model: string | null
  generation_seed: string | null
  blind_review_answer_index: 0 | 1 | 2 | 3 | null
  blind_review_matches: boolean | null
  blind_reviewer_model: string | null
  blind_reviewer_notes: string | null
  blind_reviewed_at: string | null
  editorial_status: EditorialStatus
  reviewer_confidence: number | null
  reviewer_notes: string | null
  verification_status: VerificationStatus
  verification_source: string | null
  verification_model: string | null
  verification_notes: string | null
  verified_at: string | null
  duplicate_score: number | null
  normalized_question_hash: string
  created_at: string
  reviewed_at: string | null
}

export type QuestionCandidateInput = Pick<QuestionCandidate,
  'category' | 'subcategory' | 'difficulty' | 'difficulty_rating' | 'question_text' |
  'choices' | 'correct_answer_index' | 'correct_answer' | 'explanation' | 'tags' |
  'generation_batch_id' | 'generator_model' | 'generation_seed'
>

export class QuestionCandidateValidationError extends Error {}
export class CandidatePromotionError extends Error {}

const normalize = (value: string) => value.trim().toLowerCase()

/** Validate candidate data before it reaches the database constraints. */
export function validateQuestionCandidate(input: QuestionCandidateInput): QuestionCandidateInput {
  if (!CATEGORIES.includes(input.category)) throw new QuestionCandidateValidationError('Unsupported category')
  if (!DIFFICULTIES.includes(input.difficulty)) throw new QuestionCandidateValidationError('Unsupported difficulty')
  if (!Number.isInteger(input.difficulty_rating) || input.difficulty_rating < 1 || input.difficulty_rating > 10) {
    throw new QuestionCandidateValidationError('difficulty_rating must be an integer from 1 through 10')
  }
  if (!input.question_text?.trim()) throw new QuestionCandidateValidationError('question_text is required')
  if (!Array.isArray(input.choices) || input.choices.length !== 4) {
    throw new QuestionCandidateValidationError('choices must contain exactly four strings')
  }
  if (!input.choices.every(choice => typeof choice === 'string' && choice.trim())) {
    throw new QuestionCandidateValidationError('Every choice must be a non-empty string')
  }
  if (new Set(input.choices.map(normalize)).size !== 4) {
    throw new QuestionCandidateValidationError('Choices must be distinct after trimming and case normalization')
  }
  if (!Number.isInteger(input.correct_answer_index) || input.correct_answer_index < 0 || input.correct_answer_index > 3) {
    throw new QuestionCandidateValidationError('correct_answer_index must be from 0 through 3')
  }
  if (!input.correct_answer?.trim()) throw new QuestionCandidateValidationError('correct_answer is required')
  if (normalize(input.correct_answer) !== normalize(input.choices[input.correct_answer_index])) {
    throw new QuestionCandidateValidationError('correct_answer must match the indexed choice')
  }
  if (!Array.isArray(input.tags) || !input.tags.every(tag => typeof tag === 'string')) {
    throw new QuestionCandidateValidationError('tags must be an array of strings')
  }
  return input
}

export function assertCandidateCanBePromoted(candidate: Pick<QuestionCandidate,
  'editorial_status' | 'blind_review_answer_index' | 'blind_review_matches' | 'verification_status'
>, allowUnverified = false): void {
  if (candidate.editorial_status !== 'approved') throw new CandidatePromotionError('Candidate must be approved before promotion')
  if (candidate.blind_review_answer_index !== null && candidate.blind_review_matches !== true) {
    throw new CandidatePromotionError('Candidate blind review did not match')
  }
  if (!allowUnverified && candidate.verification_status !== 'verified') {
    throw new CandidatePromotionError('Candidate must be verified before promotion')
  }
}

/** Calls the database RPC, whose PostgreSQL function performs the actual transaction. */
export async function promoteQuestionCandidate(
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> },
  candidateId: string,
  options: { allowUnverified?: boolean } = {},
): Promise<unknown> {
  const { data, error } = await supabase.rpc('promote_question_candidate', {
    p_candidate_id: candidateId,
    p_allow_unverified: options.allowUnverified ?? false,
  })
  if (error) throw new CandidatePromotionError(error.message)
  return data
}
