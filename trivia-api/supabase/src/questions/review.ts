import type { EditorialStatus, QuestionCandidate, VerificationStatus } from './candidates.ts'

const EDITORIAL_STATUSES: readonly EditorialStatus[] = ['pending', 'approved', 'revise', 'rejected']
const VERIFICATION_STATUSES: readonly VerificationStatus[] = ['unverified', 'verified', 'failed']

export class AdminAuthorizationError extends Error {}
export class ReviewValidationError extends Error {}

export interface ReviewUpdate {
  blind_review_answer_index?: 0 | 1 | 2 | 3 | null
  editorial_status?: EditorialStatus
  reviewer_confidence?: number | null
  reviewer_notes?: string | null
  verification_status?: VerificationStatus
  verification_source?: string | null
}

export type ReviewPatch = Omit<ReviewUpdate, 'blind_review_answer_index'> & {
  blind_review_answer_index?: 0 | 1 | 2 | 3 | null
  blind_review_matches?: boolean | null
}

export function isAdminUser(userId: string, configuredAdminIds: string | undefined): boolean {
  return (configuredAdminIds ?? '').split(',').map(id => id.trim()).filter(Boolean).includes(userId)
}

export function assertAdminUser(userId: string, configuredAdminIds: string | undefined): void {
  if (!isAdminUser(userId, configuredAdminIds)) {
    throw new AdminAuthorizationError('Administrator access is required')
  }
}

/**
 * Validates only fields a reviewer may change. blind_review_matches is derived
 * from the stored answer index and never accepted from a request body.
 */
export function validateReviewUpdate(input: unknown, correctAnswerIndex: number): ReviewPatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ReviewValidationError('Review update must be an object')
  }

  const values = input as Record<string, unknown>
  const allowed = new Set([
    'blind_review_answer_index',
    'editorial_status',
    'reviewer_confidence',
    'reviewer_notes',
    'verification_status',
    'verification_source',
  ])
  for (const key of Object.keys(values)) {
    if (!allowed.has(key)) throw new ReviewValidationError(`Field is not reviewable: ${key}`)
  }
  if (Object.keys(values).length === 0) throw new ReviewValidationError('At least one review field is required')

  const patch: ReviewPatch = {}
  if ('blind_review_answer_index' in values) {
    const answer = values.blind_review_answer_index
    if (answer !== null && (!Number.isInteger(answer) || typeof answer !== 'number' || answer < 0 || answer > 3)) {
      throw new ReviewValidationError('blind_review_answer_index must be 0 through 3 or null')
    }
    patch.blind_review_answer_index = answer as 0 | 1 | 2 | 3 | null
    patch.blind_review_matches = answer === null ? null : answer === correctAnswerIndex
  }
  if ('editorial_status' in values) {
    if (typeof values.editorial_status !== 'string' || !EDITORIAL_STATUSES.includes(values.editorial_status as EditorialStatus)) {
      throw new ReviewValidationError('Invalid editorial_status')
    }
    patch.editorial_status = values.editorial_status as EditorialStatus
  }
  if ('reviewer_confidence' in values) {
    const confidence = values.reviewer_confidence
    if (confidence !== null && (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
      throw new ReviewValidationError('reviewer_confidence must be between 0 and 1')
    }
    patch.reviewer_confidence = confidence as number | null
  }
  for (const key of ['reviewer_notes', 'verification_source'] as const) {
    if (key in values && values[key] !== null && typeof values[key] !== 'string') {
      throw new ReviewValidationError(`${key} must be a string or null`)
    }
    if (key in values) patch[key] = values[key] as string | null
  }
  if ('verification_status' in values) {
    if (typeof values.verification_status !== 'string' || !VERIFICATION_STATUSES.includes(values.verification_status as VerificationStatus)) {
      throw new ReviewValidationError('Invalid verification_status')
    }
    patch.verification_status = values.verification_status as VerificationStatus
  }
  return patch
}

export type ReviewableCandidate = Pick<QuestionCandidate,
  'id' | 'question_text' | 'category' | 'subcategory' | 'difficulty' | 'difficulty_rating' |
  'choices' | 'correct_answer_index' | 'correct_answer' | 'explanation' | 'generator_model' |
  'generation_batch_id' | 'blind_review_answer_index' | 'blind_review_matches' |
  'blind_reviewer_model' | 'blind_reviewer_notes' | 'blind_reviewed_at' |
  'editorial_status' | 'reviewer_confidence' | 'reviewer_notes' | 'verification_status' |
  'verification_source' | 'duplicate_score' | 'created_at' | 'reviewed_at'
>
