import { describe, it, expect } from 'vitest'
import { validateBatch } from '../../supabase/src/openai/validator.ts'

const VALID_QUESTION = {
  questionText: 'What is the chemical symbol for gold?',
  optionA: 'Au',
  optionB: 'Ag',
  optionC: 'Fe',
  optionD: 'Cu',
  correctOption: 'a',
  explanation: 'Au comes from the Latin word "aurum" meaning gold.',
}

describe('validateBatch', () => {
  it('accepts a valid batch', () => {
    const json = JSON.stringify({ questions: [VALID_QUESTION] })
    const result = validateBatch(json)
    expect(result.valid).toHaveLength(1)
    expect(result.rejected).toHaveLength(0)
  })

  it('rejects invalid JSON', () => {
    const result = validateBatch('not json')
    expect(result.valid).toHaveLength(0)
    expect(result.rejected).toHaveLength(1)
  })

  it('rejects questions with duplicate options', () => {
    const json = JSON.stringify({
      questions: [{
        ...VALID_QUESTION,
        optionA: 'Au',
        optionB: 'Au', // duplicate
      }],
    })
    const result = validateBatch(json)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0].reason).toContain('Duplicate')
  })

  it('rejects stub question text', () => {
    const json = JSON.stringify({
      questions: [{ ...VALID_QUESTION, questionText: 'Question 1' }],
    })
    const result = validateBatch(json)
    expect(result.rejected).toHaveLength(1)
  })

  it('rejects missing explanation', () => {
    const json = JSON.stringify({
      questions: [{ ...VALID_QUESTION, explanation: '' }],
    })
    const result = validateBatch(json)
    expect(result.rejected).toHaveLength(1)
  })

  it('rejects profanity or vulgar slang questions', () => {
    const json = JSON.stringify({
      questions: [{
        ...VALID_QUESTION,
        questionText: "What do people mean when they type 'WTF' online?",
      }],
    })
    const result = validateBatch(json)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0].reason).toContain('disallowed')
  })

  it('accepts multiple valid questions in a batch', () => {
    const json = JSON.stringify({ questions: [VALID_QUESTION, VALID_QUESTION] })
    // Should accept both (same question twice is allowed by validator, deduplicator handles that)
    const result = validateBatch(json)
    expect(result.valid).toHaveLength(2)
  })
})
