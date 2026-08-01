import { describe, expect, it, vi } from 'vitest'
import {
  assertCandidateCanBePromoted,
  CandidatePromotionError,
  QuestionCandidateValidationError,
  promoteQuestionCandidate,
  validateQuestionCandidate,
} from '../../supabase/src/questions/candidates.ts'

const validCandidate = () => ({
  category: 'science' as const,
  subcategory: 'chemistry',
  difficulty: 'easy' as const,
  difficulty_rating: 3,
  question_text: 'Which gas do plants absorb during photosynthesis?',
  choices: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'] as [string, string, string, string],
  correct_answer_index: 1 as const,
  correct_answer: 'Carbon dioxide',
  explanation: 'Plants use carbon dioxide to make sugars during photosynthesis.',
  tags: ['plants'],
  generation_batch_id: null,
  generator_model: 'test-model',
  generation_seed: null,
})

describe('question candidate validation', () => {
  it('accepts a valid candidate test record', () => {
    expect(validateQuestionCandidate(validCandidate())).toEqual(validCandidate())
  })

  it.each([
    { choices: ['A', 'B', 'C'] },
    { choices: ['A', 'B', 'C', 'D', 'E'] },
  ])('rejects $choices choices', ({ choices }) => {
    expect(() => validateQuestionCandidate({ ...validCandidate(), choices: choices as unknown as [string, string, string, string] }))
      .toThrow(QuestionCandidateValidationError)
  })

  it('rejects duplicate choices after normalization', () => {
    expect(() => validateQuestionCandidate({ ...validCandidate(), choices: ['Oxygen', ' carbon dioxide ', 'CARBON DIOXIDE', 'Helium'] }))
      .toThrow('Choices must be distinct')
  })

  it('rejects an invalid answer index', () => {
    expect(() => validateQuestionCandidate({ ...validCandidate(), correct_answer_index: 4 as 0 }))
      .toThrow('correct_answer_index')
  })

  it('rejects an answer that does not match the indexed choice', () => {
    expect(() => validateQuestionCandidate({ ...validCandidate(), correct_answer: 'Oxygen' }))
      .toThrow('correct_answer must match')
  })
})

describe('candidate promotion requirements', () => {
  const approved = { editorial_status: 'approved' as const, blind_review_answer_index: 1 as const, blind_review_matches: true, verification_status: 'verified' as const }

  it('allows an approved and verified candidate', () => {
    expect(() => assertCandidateCanBePromoted(approved)).not.toThrow()
  })

  it.each(['pending', 'rejected'] as const)('rejects %s candidates', (editorial_status) => {
    expect(() => assertCandidateCanBePromoted({ ...approved, editorial_status })).toThrow(CandidatePromotionError)
  })

  it('rejects an unverified candidate unless explicitly configured', () => {
    expect(() => assertCandidateCanBePromoted({ ...approved, verification_status: 'unverified' })).toThrow(CandidatePromotionError)
    expect(() => assertCandidateCanBePromoted({ ...approved, verification_status: 'unverified' }, true)).not.toThrow()
  })

  it('uses the transaction-backed promotion RPC and surfaces duplicate promotion errors', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: { id: 'live-question' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Candidate abc has already been promoted' } })
    await expect(promoteQuestionCandidate({ rpc }, 'abc')).resolves.toEqual({ id: 'live-question' })
    await expect(promoteQuestionCandidate({ rpc }, 'abc')).rejects.toThrow('already been promoted')
    expect(rpc).toHaveBeenCalledWith('promote_question_candidate', { p_candidate_id: 'abc', p_allow_unverified: false })
  })
})
