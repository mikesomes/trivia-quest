import { describe, it, expect } from 'vitest'
import { buildUserPrompt, MAX_EXCLUSIONS } from '../../supabase/src/openai/prompts.ts'

describe('buildUserPrompt', () => {
  it('states the category, difficulty and count', () => {
    const prompt = buildUserPrompt('history', 'medium', 12)
    expect(prompt).toContain('Generate 12 trivia questions')
    expect(prompt).toContain('History')
    expect(prompt).toContain('medium')
  })

  it('omits the exclusion section when the bank is empty', () => {
    const prompt = buildUserPrompt('history', 'easy', 5, [])
    expect(prompt).not.toContain('already contains')
  })

  it('quotes existing questions verbatim so the model can avoid their subject matter', () => {
    const existing = [
      'What is the capital of France?',
      'Who painted the Mona Lisa?',
    ]
    const prompt = buildUserPrompt('general_knowledge', 'easy', 5, existing)

    for (const question of existing) {
      expect(prompt).toContain(question)
    }
  })

  // Regression: the exclusion list was previously built from truncated SHA-256
  // hashes, which carry no recoverable content. The instruction to avoid similar
  // questions could never have been followed.
  it('does not emit bare hex digests in place of question text', () => {
    const hashes = [
      'a3f5e8c1b2d40976',
      'ff01928374650abc',
    ]
    const prompt = buildUserPrompt('science', 'hard', 5, hashes)
    const hexRuns = prompt.match(/\b[0-9a-f]{16,}\b/g) ?? []
    expect(hexRuns).toEqual(hashes)
  })

  it('caps the exclusion list so prompt size stays bounded', () => {
    const existing = Array.from({ length: MAX_EXCLUSIONS + 25 }, (_, i) => `Question number ${i}?`)
    const prompt = buildUserPrompt('music', 'medium', 10, existing)

    expect(prompt).toContain('Question number 0?')
    expect(prompt).not.toContain(`Question number ${MAX_EXCLUSIONS}?`)
  })

  it('keeps the JSON-only instruction last, after the exclusion list', () => {
    const prompt = buildUserPrompt('sports', 'easy', 5, ['Who won the 1966 World Cup?'])
    expect(prompt.trimEnd().endsWith('Return ONLY a JSON array of questions matching the schema. No additional text.')).toBe(true)
  })

  it('applies per-category guidance where it exists', () => {
    expect(buildUserPrompt('famous_quotes', 'easy', 5)).toContain('Who said:')
  })
})
