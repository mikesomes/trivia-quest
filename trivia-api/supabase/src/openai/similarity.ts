/**
 * Trigram similarity, matching PostgreSQL's pg_trgm.
 *
 * Kept deliberately faithful to pg_trgm so a threshold tuned with the audit
 * script means the same thing when it is applied in SQL. pg_trgm lowercases,
 * treats any run of non-alphanumerics as a word break, pads each word with two
 * leading spaces and one trailing space, then takes every 3-character window.
 * similarity() is the Jaccard index of the two trigram sets.
 *
 * This catches rewording — "Who painted the Mona Lisa?" against "Which artist
 * painted the Mona Lisa?" — which is what a single model generating repeatedly
 * from one prompt actually produces. It does not catch paraphrase with no
 * shared vocabulary; that needs embeddings, and is only worth the cost if the
 * audit shows lexical matching missing a meaningful share.
 */

/**
 * Similarity at or above which two questions sharing a correct answer are
 * treated as the same question. Must stay in step with the p_threshold default
 * on check_question_duplicates (migration 20240064).
 *
 * Calibrated against the live bank with scripts/audit-duplicates.ts, not picked
 * by intuition. The two populations it has to separate overlap:
 *
 *   true duplicates (nfl_football, all answering "Cleveland Browns")
 *     0.588  "...longest active playoff drought as of 2023?"
 *          / "...longest playoff drought as of the end of the 2021 season?"
 *     0.742  "...longest active playoff drought as of 2023?"
 *          / "Which NFL team has the longest playoff drought?"
 *
 *   distinct questions that share an answer (geography, all answering "Brazil")
 *     0.361  "fifth largest country by area?" / "home to the Pantanal?"
 *     0.536  "fifth largest country by area?" / "largest country in South America?"
 *
 * 0.55 sits in the gap. Erring high is deliberate — a false positive silently
 * discards a good question and shrinks the bank, while a false negative leaves
 * a duplicate the audit will surface later.
 */
export const NEAR_DUPLICATE_THRESHOLD = 0.55

export function trigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  const set = new Set<string>()
  for (const word of words) {
    const padded = `  ${word} `
    for (let i = 0; i + 3 <= padded.length; i++) {
      set.add(padded.slice(i, i + 3))
    }
  }
  return set
}

/** Jaccard index of two trigram sets, in [0, 1]. */
export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0

  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  let shared = 0
  for (const gram of small) {
    if (large.has(gram)) shared++
  }
  return shared / (a.size + b.size - shared)
}

/** Convenience wrapper for one-off comparisons. Prefer reusing trigram sets in loops. */
export function textSimilarity(a: string, b: string): number {
  return similarity(trigrams(a), trigrams(b))
}

/**
 * Normalized correct-answer key. Two questions in a category sharing this are
 * strong near-duplicate candidates — most trivia questions are identified by
 * what they answer, not how they ask.
 */
export function answerKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
