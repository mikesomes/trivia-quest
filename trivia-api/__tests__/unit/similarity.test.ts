import { describe, it, expect } from 'vitest'
import { trigrams, similarity, textSimilarity, answerKey } from '../../supabase/src/openai/similarity.ts'

describe('trigrams', () => {
  it('pads each word the way pg_trgm does', () => {
    // pg_trgm: show_trgm('cat') => {"  c"," ca","at ","cat"}
    expect([...trigrams('cat')].sort()).toEqual(['  c', ' ca', 'at ', 'cat'])
  })

  it('splits on non-alphanumerics and ignores case', () => {
    expect(trigrams('Mona-Lisa!')).toEqual(trigrams('mona lisa'))
  })

  it('is empty for input with no alphanumerics', () => {
    expect(trigrams('?!  ...').size).toBe(0)
  })
})

describe('similarity', () => {
  it('is 1 for identical text', () => {
    expect(textSimilarity('What is the capital of France?', 'What is the capital of France?')).toBe(1)
  })

  it('is 0 when either side has no trigrams', () => {
    expect(textSimilarity('', 'anything at all')).toBe(0)
  })

  it('is symmetric', () => {
    const a = 'Who wrote Hamlet?'
    const b = 'Which playwright wrote Hamlet?'
    expect(textSimilarity(a, b)).toBeCloseTo(textSimilarity(b, a), 10)
  })

  it('scores a reworded duplicate well above an unrelated question', () => {
    const original = 'Who painted the Mona Lisa?'
    const reworded = 'Which artist painted the Mona Lisa?'
    const unrelated = 'What is the boiling point of water in Celsius?'

    expect(textSimilarity(original, reworded)).toBeGreaterThan(textSimilarity(original, unrelated))
    expect(textSimilarity(original, unrelated)).toBeLessThan(0.2)
  })

  it('ignores punctuation and spacing differences', () => {
    expect(textSimilarity('What is the capital of France?', 'what is the capital of france')).toBe(1)
  })
})

describe('answerKey', () => {
  it('collapses case, punctuation and spacing', () => {
    expect(answerKey('Leonardo da Vinci')).toBe(answerKey('leonardo  da-vinci!'))
  })

  it('keeps genuinely different answers apart', () => {
    expect(answerKey('Leonardo da Vinci')).not.toBe(answerKey('Michelangelo'))
  })
})
