import { describe, it, expect } from 'vitest'

type AnswerOption = 'a' | 'b' | 'c' | 'd'

function pickEliminatedOptions(correctOption: AnswerOption): AnswerOption[] {
  const allOptions: AnswerOption[] = ['a', 'b', 'c', 'd']
  const wrongOptions = allOptions.filter((o) => o !== correctOption)
  for (let i = wrongOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[wrongOptions[i], wrongOptions[j]] = [wrongOptions[j], wrongOptions[i]]
  }
  return wrongOptions.slice(0, 2)
}

describe('hammer elimination logic', () => {
  const allOptions: AnswerOption[] = ['a', 'b', 'c', 'd']

  it('eliminates exactly 2 options', () => {
    for (const correct of allOptions) {
      const eliminated = pickEliminatedOptions(correct)
      expect(eliminated).toHaveLength(2)
    }
  })

  it('never eliminates the correct answer', () => {
    for (const correct of allOptions) {
      for (let i = 0; i < 20; i++) {
        const eliminated = pickEliminatedOptions(correct)
        expect(eliminated).not.toContain(correct)
      }
    }
  })

  it('eliminated options are always distinct', () => {
    for (const correct of allOptions) {
      for (let i = 0; i < 20; i++) {
        const eliminated = pickEliminatedOptions(correct)
        expect(new Set(eliminated).size).toBe(2)
      }
    }
  })

  it('eliminated options are all wrong options (only 3 wrong exist, picks 2)', () => {
    for (const correct of allOptions) {
      const wrongOptions = allOptions.filter((o) => o !== correct)
      for (let i = 0; i < 20; i++) {
        const eliminated = pickEliminatedOptions(correct)
        for (const opt of eliminated) {
          expect(wrongOptions).toContain(opt)
        }
      }
    }
  })

  it('over many runs, all wrong options are eventually eliminated', () => {
    // Checks the shuffle is not biased to always pick the same 2
    const correct: AnswerOption = 'a'
    const seen = new Set<AnswerOption>()
    for (let i = 0; i < 100; i++) {
      const eliminated = pickEliminatedOptions(correct)
      for (const opt of eliminated) seen.add(opt)
    }
    // All 3 wrong options should appear eventually
    expect(seen).toContain('b')
    expect(seen).toContain('c')
    expect(seen).toContain('d')
  })
})
