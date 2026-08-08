import { describe, expect, it } from 'vitest'
import {
  compareQuality,
  selectSurvivors,
  type BankRow,
  type DuplicatePair,
} from '../../supabase/src/questions/bankDedup.ts'

function pair(aId: string, bId: string, score = 0.6): DuplicatePair {
  return { aId, bId, score }
}

function row(id: string, overrides: Partial<BankRow> = {}): BankRow {
  return {
    id,
    category: 'music',
    difficulty: 'medium',
    question_text: `Question ${id}`,
    explanation: null,
    times_used: 0,
    source: 'trivia-api',
    source_candidate_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mapOf(...rows: BankRow[]): Map<string, BankRow> {
  return new Map(rows.map(r => [r.id, r]))
}

function best(rows: BankRow[]): string {
  return [...rows].sort(compareQuality)[0].id
}

/** Every id that selectSurvivors decided to drop. */
function dropped(groups: ReturnType<typeof selectSurvivors>): string[] {
  return groups.flatMap(g => g.drop.map(d => d.row.id)).sort()
}

describe('compareQuality', () => {
  it('prefers a row with an explanation', () => {
    expect(best([row('a', { times_used: 99 }), row('b', { explanation: 'Because.' })])).toBe('b')
  })

  it('treats a whitespace-only explanation as absent', () => {
    expect(best([row('a', { explanation: '   ' }), row('b', { explanation: 'Because.' })])).toBe('b')
  })

  it('falls to times_used when explanations tie', () => {
    expect(best([row('a', { explanation: 'x', times_used: 2 }), row('b', { explanation: 'x', times_used: 40 })])).toBe('b')
  })

  it('treats a null times_used as zero', () => {
    expect(best([row('a', { times_used: null }), row('b', { times_used: 1 })])).toBe('b')
  })

  it('prefers opentdb, then a reviewed candidate, then raw generator output', () => {
    const generated = row('a', { source: 'openai-gpt-4o-mini' })
    const reviewed = row('b', { source: 'trivia-api', source_candidate_id: 'cand-1' })
    const curated = row('c', { source: 'opentdb' })
    expect(best([generated, reviewed, curated])).toBe('c')
    expect(best([generated, reviewed])).toBe('b')
  })

  it('falls to the older row when provenance ties', () => {
    expect(best([row('a', { created_at: '2026-05-01T00:00:00Z' }), row('b', { created_at: '2024-01-01T00:00:00Z' })])).toBe('b')
  })

  it('falls to the lowest id when every signal ties', () => {
    expect(best([row('b'), row('a'), row('c')])).toBe('a')
  })
})

describe('selectSurvivors', () => {
  it('returns nothing when there are no pairs', () => {
    expect(selectSurvivors([], mapOf(row('a')))).toEqual([])
  })

  it('keeps the better of a duplicated pair and drops the other', () => {
    const rows = mapOf(row('a'), row('b', { explanation: 'better' }))
    const groups = selectSurvivors([pair('a', 'b')], rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].keep.id).toBe('b')
    expect(dropped(groups)).toEqual(['a'])
  })

  it('reports the score of the edge that justified the drop', () => {
    const rows = mapOf(row('a'), row('b'))
    const groups = selectSurvivors([pair('a', 'b', 0.83)], rows)
    expect(groups[0].drop[0].score).toBeCloseTo(0.83)
  })

  it('leaves rows that no pair references untouched', () => {
    const rows = mapOf(row('a'), row('b'), row('c'))
    const groups = selectSurvivors([pair('a', 'b')], rows)
    expect(dropped(groups)).not.toContain('c')
    expect(groups.flatMap(g => g.keep.id)).not.toContain('c')
  })

  it('ignores a pair whose rows are missing from the row map', () => {
    expect(selectSurvivors([pair('x', 'y')], mapOf(row('a')))).toEqual([])
  })

  // The core reason this is greedy rather than transitive closure. A-B and B-C
  // are duplicates but A-C is not; dropping C on the strength of the chain
  // would delete a distinct question. B loses to A, and C then has no kept
  // neighbour, so it survives.
  it('does not drop a question that only duplicates something already dropped', () => {
    const rows = mapOf(row('a'), row('b'), row('c'))
    const groups = selectSurvivors([pair('a', 'b'), pair('b', 'c')], rows)
    expect(dropped(groups)).toEqual(['b'])
    const survivors = ['a', 'c']
    for (const id of survivors) expect(dropped(groups)).not.toContain(id)
  })

  it('does drop the third question when it duplicates the survivor directly', () => {
    const rows = mapOf(row('a'), row('b'), row('c'))
    const groups = selectSurvivors([pair('a', 'b'), pair('b', 'c'), pair('a', 'c')], rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].keep.id).toBe('a')
    expect(dropped(groups)).toEqual(['b', 'c'])
  })

  it('attributes a drop to the strongest edge among kept neighbours', () => {
    const rows = mapOf(row('a'), row('b'), row('c', { explanation: 'weakest quality but no edges to a or b' }))
    // c is best by quality so it is kept first; a and b both duplicate it.
    const groups = selectSurvivors([pair('c', 'a', 0.6), pair('c', 'b', 0.9)], rows)
    expect(groups[0].keep.id).toBe('c')
    const scores = Object.fromEntries(groups[0].drop.map(d => [d.row.id, d.score]))
    expect(scores.a).toBeCloseTo(0.6)
    expect(scores.b).toBeCloseTo(0.9)
  })

  it('produces the same result whatever order the pairs arrive in', () => {
    const rows = mapOf(row('a'), row('b'), row('c'), row('d'))
    const pairs = [pair('a', 'b'), pair('b', 'c'), pair('c', 'd')]
    const forward = dropped(selectSurvivors(pairs, rows))
    const reversed = dropped(selectSurvivors([...pairs].reverse(), rows))
    expect(forward).toEqual(reversed)
  })

  // The property the whole sweep exists to establish, and the thing that makes
  // it safe to run twice: after the drops are gone, no two survivors duplicate
  // each other, so a second pass finds nothing.
  it('leaves no pair standing between two survivors', () => {
    const rows = mapOf(
      row('a'),
      row('b', { explanation: 'x' }),
      row('c', { times_used: 5 }),
      row('d', { source: 'opentdb' }),
      row('e')
    )
    const pairs = [pair('a', 'b'), pair('b', 'c'), pair('c', 'd'), pair('d', 'e'), pair('a', 'e')]
    const groups = selectSurvivors(pairs, rows)
    const goneIds = new Set(dropped(groups))
    const survivingPairs = pairs.filter(p => !goneIds.has(p.aId) && !goneIds.has(p.bId))
    expect(survivingPairs).toEqual([])
  })

  it('is a no-op on a second pass over the survivors', () => {
    const rows = mapOf(row('a'), row('b'), row('c'), row('d'))
    const pairs = [pair('a', 'b'), pair('b', 'c'), pair('a', 'c'), pair('c', 'd')]
    const first = selectSurvivors(pairs, rows)
    const goneIds = new Set(dropped(first))
    const remaining = pairs.filter(p => !goneIds.has(p.aId) && !goneIds.has(p.bId))
    expect(selectSurvivors(remaining, rows)).toEqual([])
  })
})
