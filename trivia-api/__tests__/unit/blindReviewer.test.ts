import { describe, expect, it } from 'vitest'
import { blindReviewQuestion, buildBlindReviewPrompt, makeBlindReviewPatch } from '../../supabase/src/openai/blindReviewer.ts'

const candidate = {
  id: 'candidate-1',
  category: 'science',
  question_text: 'Which planet is known as the Red Planet?',
  choices: ['Earth', 'Mars', 'Jupiter', 'Venus'] as [string, string, string, string],
  correct_answer_index: 1,
}

describe('AI blind reviewer', () => {
  it('does not include the stored answer index in the model prompt', () => {
    const prompt = buildBlindReviewPrompt(candidate)
    expect(prompt).toContain('Which planet is known as the Red Planet?')
    expect(prompt).toContain('1. Mars')
    expect(prompt).not.toContain('correct_answer_index')
    expect(prompt).not.toContain('stored correct')
  })

  it('uses structured output and accepts a valid blind answer', async () => {
    const chat = async () => JSON.stringify({ answer_index: 1, confidence: 0.98, notes: 'Mars is the established answer.' })
    await expect(blindReviewQuestion(candidate, chat)).resolves.toEqual({ answer_index: 1, confidence: 0.98, notes: 'Mars is the established answer.' })
  })

  it('calculates match status server-side', () => {
    expect(makeBlindReviewPatch({ answer_index: 1, confidence: 0.9, notes: 'x' }, 1).blind_review_matches).toBe(true)
    expect(makeBlindReviewPatch({ answer_index: 0, confidence: 0.9, notes: 'x' }, 1).blind_review_matches).toBe(false)
  })

  it('rejects malformed model output', async () => {
    await expect(blindReviewQuestion(candidate, async () => JSON.stringify({ answer_index: 7, confidence: 1, notes: 'bad' })))
      .rejects.toThrow('invalid answer index')
  })
})
