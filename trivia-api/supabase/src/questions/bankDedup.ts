/**
 * Retroactive near-duplicate resolution for the live question bank.
 *
 * The generation-side gate (check_question_duplicates, and
 * dropNearDuplicatesWithinBatch for the in-batch case) stops new duplicates at
 * the door. Neither has ever been applied backwards, so questions that predate
 * the gate are still in the bank asking the same thing twice.
 *
 * Detection is deliberately NOT here: it belongs in SQL, where pg_trgm's
 * similarity() is the same function the live gate uses. The JS reimplementation
 * in openai/similarity.ts is faithful but not identical — the two disagree on a
 * handful of pairs at the threshold boundary — and the database is the
 * authority. This module takes the pairs the database found and decides what to
 * do about them.
 */

/** One near-duplicate edge, as returned by the SQL detection query. */
export interface DuplicatePair {
  aId: string
  bId: string
  score: number
}

/** The subset of a question_bank row that survivor selection reads. */
export interface BankRow {
  id: string
  category: string
  difficulty: string
  question_text: string
  explanation: string | null
  times_used: number | null
  source: string | null
  source_candidate_id: string | null
  created_at: string
}

/** A question that lost, and the score of the edge to the question that displaced it. */
export interface DropRecord {
  row: BankRow
  score: number
}

export interface SurvivorGroup {
  keep: BankRow
  drop: DropRecord[]
}

function sourceRank(row: BankRow): number {
  // Open Trivia DB content is human-curated and measurably cleaner: video_games
  // was seeded from it and carries a 0.3% duplication rate against 20-30% for
  // generated categories. A row with a source_candidate_id cleared blind
  // review, fact verification and editorial review, so it outranks raw
  // generator output.
  if (row.source === 'opentdb') return 0
  if (row.source_candidate_id) return 1
  return 2
}

function hasExplanation(row: BankRow): boolean {
  return Boolean(row.explanation && row.explanation.trim().length > 0)
}

/**
 * Quality order, best first. Ends in `id`, which is unique, so this is a total
 * order — the same input always produces the same winner, which is what makes
 * the sweep safe to run twice.
 */
export function compareQuality(a: BankRow, b: BankRow): number {
  // 1. An explanation is shown to the player after they answer, and only about
  //    a quarter of the bank has one. Strongest quality signal available.
  const explanation = Number(hasExplanation(b)) - Number(hasExplanation(a))
  if (explanation !== 0) return explanation

  // 2. Prefer the phrasing players have actually been served.
  const used = (b.times_used ?? 0) - (a.times_used ?? 0)
  if (used !== 0) return used

  // 3. Provenance.
  const source = sourceRank(a) - sourceRank(b)
  if (source !== 0) return source

  // 4. The established row, not the newer copy of it.
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1

  // 5. Total order, so the result is deterministic.
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Choose which questions survive, keeping every drop attributable to a question
 * it *directly* duplicates.
 *
 * Deliberately not transitive closure. Similarity is not a transitive relation:
 * "Who painted the Mona Lisa?" duplicates "Which artist painted the Mona Lisa?",
 * and that in turn scores against "Which artist painted The Last Supper?" —
 * all three answer Leonardo da Vinci — but the first and last are different
 * questions. Merging a connected component and keeping one member would delete
 * the Last Supper question on the strength of a chain it is only indirectly
 * part of. On the live bank that mistake accounted for 157 of 1,042 drops, and
 * produced components as large as twenty questions.
 *
 * Greedy selection over the quality order instead: walk best-first, keep a
 * question unless it directly duplicates something already kept, and record
 * which kept question displaced it. This still guarantees no two survivors are
 * near-duplicates of each other — the property the sweep exists to establish —
 * while never dropping a question that has no direct edge to its replacement.
 */
export function selectSurvivors(pairs: DuplicatePair[], rowsById: Map<string, BankRow>): SurvivorGroup[] {
  // Adjacency, with the score kept so a drop can be reported against the edge
  // that actually justified it.
  const neighbors = new Map<string, Map<string, number>>()
  const link = (from: string, to: string, score: number) => {
    const existing = neighbors.get(from) ?? new Map<string, number>()
    // Keep the strongest edge if the same two rows collide more than once.
    existing.set(to, Math.max(existing.get(to) ?? 0, score))
    neighbors.set(from, existing)
  }

  for (const pair of pairs) {
    if (!rowsById.has(pair.aId) || !rowsById.has(pair.bId)) continue
    link(pair.aId, pair.bId, pair.score)
    link(pair.bId, pair.aId, pair.score)
  }

  const candidates = [...neighbors.keys()]
    .map(id => rowsById.get(id))
    .filter((row): row is BankRow => row !== undefined)
    .sort(compareQuality)

  const keptIds = new Set<string>()
  const dropsByKeeper = new Map<string, DropRecord[]>()

  for (const row of candidates) {
    const adjacency = neighbors.get(row.id)!

    // Among already-kept neighbours, attribute the drop to the strongest edge.
    let displacer: { id: string; score: number } | null = null
    for (const [neighborId, score] of adjacency) {
      if (!keptIds.has(neighborId)) continue
      if (!displacer || score > displacer.score) displacer = { id: neighborId, score }
    }

    if (!displacer) {
      keptIds.add(row.id)
      continue
    }

    const drops = dropsByKeeper.get(displacer.id) ?? []
    drops.push({ row, score: displacer.score })
    dropsByKeeper.set(displacer.id, drops)
  }

  const groups: SurvivorGroup[] = []
  for (const [keeperId, drop] of dropsByKeeper) {
    groups.push({ keep: rowsById.get(keeperId)!, drop })
  }
  return groups
}
