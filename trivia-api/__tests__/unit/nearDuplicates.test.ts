import { describe, it, expect } from 'vitest'
import { dropNearDuplicatesWithinBatch } from '../../supabase/src/openai/deduplicator.ts'
import { NEAR_DUPLICATE_THRESHOLD } from '../../supabase/src/openai/similarity.ts'

function q(questionText: string, correct: string, others = ['X', 'Y', 'Z']) {
  return {
    questionText,
    optionA: correct,
    optionB: others[0],
    optionC: others[1],
    optionD: others[2],
    correctOption: 'a' as const,
    explanation: 'Because.',
  }
}

describe('dropNearDuplicatesWithinBatch', () => {
  it('keeps a batch with no repeated answers untouched', () => {
    const batch = [
      q('What is the capital of France?', 'Paris'),
      q('What is the capital of Germany?', 'Berlin'),
      q('What is the capital of Italy?', 'Rome'),
    ]
    const { unique, nearDuplicates } = dropNearDuplicatesWithinBatch(batch)
    expect(unique).toHaveLength(3)
    expect(nearDuplicates).toHaveLength(0)
  })

  it('drops a reworded question that resolves to the same answer', () => {
    const batch = [
      q('Who painted the Mona Lisa?', 'Leonardo da Vinci'),
      q('Which artist painted the Mona Lisa?', 'Leonardo da Vinci'),
    ]
    const { unique, nearDuplicates } = dropNearDuplicatesWithinBatch(batch)

    expect(unique).toHaveLength(1)
    expect(unique[0].questionText).toBe('Who painted the Mona Lisa?')
    expect(nearDuplicates).toHaveLength(1)
    expect(nearDuplicates[0].score).toBeGreaterThanOrEqual(NEAR_DUPLICATE_THRESHOLD)
  })

  // The case that makes text similarity alone unusable: these score 0.88 on
  // trigrams but are entirely different questions.
  it('keeps sibling questions that are phrased alike but answer differently', () => {
    const batch = [
      q('Which element has the symbol Au?', 'Gold'),
      q('Which element has the symbol Ag?', 'Silver'),
      q('Which element has the symbol Fe?', 'Iron'),
    ]
    const { unique, nearDuplicates } = dropNearDuplicatesWithinBatch(batch)
    expect(unique).toHaveLength(3)
    expect(nearDuplicates).toHaveLength(0)
  })

  // The converse: a shared answer alone is not enough.
  it('keeps different questions that happen to share an answer', () => {
    const batch = [
      q('Who painted the Mona Lisa?', 'Leonardo da Vinci'),
      q('Who sketched an early design for a flying machine?', 'Leonardo da Vinci'),
    ]
    const { unique, nearDuplicates } = dropNearDuplicatesWithinBatch(batch)
    expect(unique).toHaveLength(2)
    expect(nearDuplicates).toHaveLength(0)
  })

  it('treats answers differing only in case or punctuation as the same', () => {
    const batch = [
      q('Who wrote Hamlet?', 'William Shakespeare'),
      q('Which playwright wrote Hamlet?', 'william  shakespeare!'),
    ]
    const { unique } = dropNearDuplicatesWithinBatch(batch, 0.4)
    expect(unique).toHaveLength(1)
  })

  it('compares against every earlier survivor, not just the previous one', () => {
    const batch = [
      q('Who wrote Hamlet?', 'William Shakespeare'),
      q('What is the capital of France?', 'Paris'),
      q('Which playwright wrote Hamlet?', 'William Shakespeare'),
    ]
    const { unique, nearDuplicates } = dropNearDuplicatesWithinBatch(batch, 0.4)
    expect(unique.map(u => u.questionText)).toEqual([
      'Who wrote Hamlet?',
      'What is the capital of France?',
    ])
    expect(nearDuplicates[0].kept.questionText).toBe('Who wrote Hamlet?')
  })

  it('reports which question was kept and which was dropped', () => {
    const batch = [
      q('In what year did World War II end?', '1945'),
      q('What year did World War II come to an end?', '1945'),
    ]
    const { nearDuplicates } = dropNearDuplicatesWithinBatch(batch)
    expect(nearDuplicates[0].kept.questionText).toBe('In what year did World War II end?')
    expect(nearDuplicates[0].dropped.questionText).toBe('What year did World War II come to an end?')
  })

  it('honours a caller-supplied threshold', () => {
    const batch = [
      q('Who wrote Hamlet?', 'William Shakespeare'),
      q('Which playwright wrote Hamlet?', 'William Shakespeare'),
    ]
    // ~0.45 pair: dropped at a lenient threshold, kept at the calibrated
    // default, which is deliberately set above this band.
    expect(dropNearDuplicatesWithinBatch(batch, 0.4).unique).toHaveLength(1)
    expect(dropNearDuplicatesWithinBatch(batch).unique).toHaveLength(2)
  })

  it('passes through questions whose correct answer is blank', () => {
    const batch = [q('Placeholder?', ''), q('Another placeholder?', '')]
    const { unique, nearDuplicates } = dropNearDuplicatesWithinBatch(batch)
    expect(unique).toHaveLength(2)
    expect(nearDuplicates).toHaveLength(0)
  })
})
