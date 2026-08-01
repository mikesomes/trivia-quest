import { describe, expect, it } from 'vitest'
import { parseFactVerification, verificationPrompt } from '../../supabase/src/openai/factVerifier.ts'
describe('AI fact verifier', () => {
  it('includes the stated answer for fact checking', () => expect(verificationPrompt({ question_text: 'Capital of France?', choices: ['Paris'], correct_answer: 'Paris', explanation: null })).toContain('Stated answer: Paris'))
  it('fails safe when no returned web source validates the model citation', () => expect(parseFactVerification(JSON.stringify({ status: 'verified', confidence: 1, notes: 'x', source_url: 'https://fake.test' }), ['https://real.test']).status).toBe('unverified'))
  it('keeps a verified result with an actual web source', () => expect(parseFactVerification(JSON.stringify({ status: 'verified', confidence: .9, notes: 'x', source_url: 'https://real.test' }), ['https://real.test']).status).toBe('verified'))
})
