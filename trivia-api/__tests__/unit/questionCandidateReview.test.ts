import { describe, expect, it } from 'vitest'
import {
  AdminAuthorizationError,
  ReviewValidationError,
  assertAdminUser,
  isAdminUser,
  validateReviewUpdate,
} from '../../supabase/src/questions/review.ts'
import { assertCandidateCanBePromoted, CandidatePromotionError } from '../../supabase/src/questions/candidates.ts'

describe('candidate review authorization', () => {
  const admins = 'admin-1,admin-2'

  it('allows configured administrators', () => {
    expect(isAdminUser('admin-2', admins)).toBe(true)
  })

  it('prevents a non-admin user from listing or reviewing candidates', () => {
    expect(() => assertAdminUser('player-1', admins)).toThrow(AdminAuthorizationError)
  })

  it('prevents a non-admin user from promoting candidates', () => {
    expect(() => assertAdminUser('player-1', admins)).toThrow('Administrator access is required')
  })
})

describe('candidate review validation', () => {
  it('calculates a matching blind-review answer on the server', () => {
    expect(validateReviewUpdate({ blind_review_answer_index: 2 }, 2)).toEqual({
      blind_review_answer_index: 2,
      blind_review_matches: true,
    })
  })

  it('calculates a non-matching blind-review answer on the server', () => {
    expect(validateReviewUpdate({ blind_review_answer_index: 1 }, 2)).toMatchObject({ blind_review_matches: false })
  })

  it.each([-0.01, 1.01, Number.NaN])('rejects invalid confidence %s', (reviewer_confidence) => {
    expect(() => validateReviewUpdate({ reviewer_confidence }, 0)).toThrow(ReviewValidationError)
  })

  it('rejects invalid editorial and verification statuses', () => {
    expect(() => validateReviewUpdate({ editorial_status: 'published' }, 0)).toThrow('Invalid editorial_status')
    expect(() => validateReviewUpdate({ verification_status: 'maybe' }, 0)).toThrow('Invalid verification_status')
  })

  it('only permits explicit review fields', () => {
    expect(() => validateReviewUpdate({ question_text: 'tamper attempt' }, 0)).toThrow('Field is not reviewable')
    expect(() => validateReviewUpdate({ blind_review_matches: true }, 0)).toThrow('Field is not reviewable')
  })
})

describe('promotion gate remains strict after review', () => {
  const approved = { editorial_status: 'approved' as const, blind_review_answer_index: 0 as const, blind_review_matches: true, verification_status: 'verified' as const }

  it('allows approved and verified candidates', () => {
    expect(() => assertCandidateCanBePromoted(approved)).not.toThrow()
  })

  it.each([
    { ...approved, editorial_status: 'pending' as const },
    { ...approved, editorial_status: 'rejected' as const },
    { ...approved, verification_status: 'unverified' as const },
  ])('rejects candidates that do not meet the promotion gate', (candidate) => {
    expect(() => assertCandidateCanBePromoted(candidate)).toThrow(CandidatePromotionError)
  })
})
