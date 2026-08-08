import { describe, expect, it } from 'vitest'
import {
  MAX_CANDIDATES_PER_RUN,
  parsePipelineTargets,
  parseTargets,
} from '../../supabase/src/questions/pipeline.ts'

describe('pipeline target parsing', () => {
  it('accepts a single well-formed target', () => {
    expect(parseTargets([{ category: 'science', difficulty: 'medium', count: 5 }])).toEqual([
      { category: 'science', difficulty: 'medium', count: 5 },
    ])
  })

  it('accepts several distinct buckets within the cap', () => {
    const targets = [
      { category: 'science', difficulty: 'easy', count: 2 },
      { category: 'science', difficulty: 'hard', count: 2 },
      { category: 'history', difficulty: 'medium', count: 1 },
    ]
    expect(parseTargets(targets)).toHaveLength(3)
  })

  it.each([
    ['a non-array', { category: 'science', difficulty: 'medium', count: 1 }],
    ['an empty array', []],
    ['null', null],
  ])('rejects %s', (_label, value) => {
    expect(() => parseTargets(value)).toThrow(/between 1 and 3/)
  })

  it('rejects more than three targets', () => {
    const targets = ['easy', 'medium', 'hard', 'easy'].map((difficulty, index) => ({
      category: index === 3 ? 'history' : 'science',
      difficulty,
      count: 1,
    }))
    expect(() => parseTargets(targets)).toThrow(/between 1 and 3/)
  })

  it.each([[null], ['science'], [42]])('rejects a target entry that is not an object (%s)', entry => {
    expect(() => parseTargets([entry])).toThrow('Each target must be an object')
  })

  it('rejects an unplayable category', () => {
    expect(() => parseTargets([{ category: 'nfl_football', difficulty: 'medium', count: 1 }])).toThrow(
      'Each target must use a valid category and difficulty'
    )
  })

  it('rejects a difficulty that is not generated', () => {
    expect(() => parseTargets([{ category: 'science', difficulty: 'boss', count: 1 }])).toThrow(
      'Each target must use a valid category and difficulty'
    )
  })

  it.each([[0], [-1], [1.5], ['3'], [null], [MAX_CANDIDATES_PER_RUN + 1]])(
    'rejects a count of %s',
    count => {
      expect(() => parseTargets([{ category: 'science', difficulty: 'medium', count }])).toThrow(
        /count must be between 1 and 5/
      )
    }
  )

  it('rejects a repeated category/difficulty bucket', () => {
    const targets = [
      { category: 'science', difficulty: 'medium', count: 1 },
      { category: 'science', difficulty: 'medium', count: 1 },
    ]
    expect(() => parseTargets(targets)).toThrow('Targets may not repeat a category/difficulty bucket')
  })

  // The spend cap. Each individual count can be legal while the run as a whole
  // is not, so this needs its own guard: nothing downstream limits how many
  // questions a scheduled run generates.
  it('rejects targets whose counts sum above the per-run cap', () => {
    const targets = [
      { category: 'science', difficulty: 'medium', count: 3 },
      { category: 'history', difficulty: 'medium', count: 3 },
    ]
    expect(() => parseTargets(targets)).toThrow(`A run may stage at most ${MAX_CANDIDATES_PER_RUN} candidates`)
  })

  it('allows counts that sum to exactly the cap', () => {
    const targets = [
      { category: 'science', difficulty: 'medium', count: 3 },
      { category: 'history', difficulty: 'medium', count: 2 },
    ]
    expect(parseTargets(targets).reduce((total, t) => total + t.count, 0)).toBe(MAX_CANDIDATES_PER_RUN)
  })
})

describe('AI_PIPELINE_TARGETS configuration', () => {
  it('parses a configured target list', () => {
    const raw = '[{"category":"science","difficulty":"medium","count":5}]'
    expect(parsePipelineTargets(raw)).toEqual([{ category: 'science', difficulty: 'medium', count: 5 }])
  })

  it.each([[undefined], ['']])('fails closed when the variable is missing (%s)', raw => {
    expect(() => parsePipelineTargets(raw)).toThrow('Missing AI_PIPELINE_TARGETS')
  })

  it('reports malformed JSON distinctly from an invalid target', () => {
    expect(() => parsePipelineTargets('{not json')).toThrow('AI_PIPELINE_TARGETS must be valid JSON')
  })

  it('still applies the target rules to a parsed value', () => {
    expect(() => parsePipelineTargets('[]')).toThrow(/between 1 and 3/)
  })
})
