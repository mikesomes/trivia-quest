import { describe, it, expect } from 'vitest'
import { computeContentHash, deduplicateQuestions } from '../../supabase/src/openai/deduplicator.ts'

const Q1 = {
  questionText: 'What is the chemical symbol for gold?',
  optionA: 'Au',
  optionB: 'Ag',
  optionC: 'Fe',
  optionD: 'Cu',
  correctOption: 'a' as const,
  explanation: 'Au from Latin aurum.',
}

const Q2 = {
  questionText: 'What is the capital of France?',
  optionA: 'Paris',
  optionB: 'London',
  optionC: 'Berlin',
  optionD: 'Madrid',
  correctOption: 'a' as const,
  explanation: 'Paris is the capital of France.',
}

describe('computeContentHash', () => {
  it('is deterministic for the same input', () => {
    const h1 = computeContentHash(Q1)
    const h2 = computeContentHash(Q1)
    expect(h1).toBe(h2)
  })

  it('produces different hashes for different questions', () => {
    expect(computeContentHash(Q1)).not.toBe(computeContentHash(Q2))
  })

  it('is case-insensitive (same question different casing = same hash)', () => {
    const q1Upper = { ...Q1, questionText: Q1.questionText.toUpperCase(), optionA: 'AU' }
    expect(computeContentHash(Q1)).toBe(computeContentHash(q1Upper))
  })

  it('produces a 64-char hex string (SHA-256)', () => {
    const hash = computeContentHash(Q1)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('deduplicateQuestions', () => {
  it('removes questions with existing hashes', () => {
    const hash = computeContentHash(Q1)
    const result = deduplicateQuestions([Q1, Q2], new Set([hash]))
    expect(result.unique).toHaveLength(1)
    expect(result.duplicates).toHaveLength(1)
  })

  it('removes duplicates within the batch itself', () => {
    const result = deduplicateQuestions([Q1, Q1, Q2], new Set())
    expect(result.unique).toHaveLength(2)
    expect(result.duplicates).toHaveLength(1)
  })

  it('passes through questions with no existing hashes', () => {
    const result = deduplicateQuestions([Q1, Q2], new Set())
    expect(result.unique).toHaveLength(2)
    expect(result.duplicates).toHaveLength(0)
  })
})
