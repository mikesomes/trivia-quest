import { describe, expect, it } from 'vitest'
import { enforceEditorialGuardrails } from '../../supabase/src/openai/editorialReviewer.ts'
describe('AI editorial guardrails', () => {
  const approved = { editorial_status: 'approved' as const, confidence: .9, notes: 'good' }
  it('rejects failed verification regardless of model recommendation', () => expect(enforceEditorialGuardrails(approved, 'failed').editorial_status).toBe('rejected'))
  it('prevents approval before verification', () => expect(enforceEditorialGuardrails(approved, 'unverified').editorial_status).toBe('revise'))
  it('allows approval only after verification', () => expect(enforceEditorialGuardrails(approved, 'verified').editorial_status).toBe('approved'))
})
