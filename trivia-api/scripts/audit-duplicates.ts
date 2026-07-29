#!/usr/bin/env vite-node
/**
 * Report how much of the question bank is near-duplicate content.
 *
 * Usage:
 *   npm run audit:duplicates
 *   npm run audit:duplicates -- --samples
 *   npm run audit:duplicates -- --category=history --threshold=0.5
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local or env.
 * Read-only: issues SELECTs against question_bank and writes nothing.
 *
 * Exact duplicates are already impossible — content_hash carries a unique
 * constraint. What this measures is the rest: questions asking the same thing
 * in different words, which the hash cannot see and which players experience
 * as repeats.
 *
 * Run before choosing a rejection threshold, and again after enforcement is on.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { trigrams, similarity, answerKey, NEAR_DUPLICATE_THRESHOLD } from '../supabase/src/openai/similarity.ts'

// ---------------------------------------------------------------------------
// Load .env.local if present
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const showSamples = args.includes('--samples')
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1]
const sampleThreshold = Number(args.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? NEAR_DUPLICATE_THRESHOLD)

const THRESHOLDS = [0.4, 0.5, 0.55, 0.6, 0.7]
const PAGE_SIZE = 1000
const MAX_SAMPLES_PER_CATEGORY = 6

interface Prepared {
  id: string
  difficulty: string
  text: string
  answer: string
  grams: Set<string>
  key: string
}

// ---------------------------------------------------------------------------
// Fetch the bank, paging past PostgREST's row cap
// ---------------------------------------------------------------------------
async function fetchAllQuestions(): Promise<Record<string, string>[]> {
  const columns = 'id,category,difficulty,question_text,option_a,option_b,option_c,option_d,correct_option'
  const rows: Record<string, string>[] = []

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({ select: columns, is_active: 'eq.true', order: 'id' })
    if (categoryFilter) params.set('category', `eq.${categoryFilter}`)

    const res = await fetch(`${SUPABASE_URL}/rest/v1/question_bank?${params}`, {
      headers: {
        apikey: SERVICE_KEY!,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      },
    })
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`)

    const page = (await res.json()) as Record<string, string>[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return rows
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------
function analyzeCategory(questions: Record<string, string>[]) {
  const prepared: Prepared[] = questions.map(q => {
    const correct = q[`option_${q.correct_option}`] ?? ''
    return {
      id: q.id,
      difficulty: q.difficulty,
      text: q.question_text,
      answer: correct,
      grams: trigrams(q.question_text),
      key: answerKey(correct),
    }
  })

  // Bucket by answer key so the same-answer pass is linear in pairs that can
  // actually collide, instead of quadratic over the whole category.
  const byAnswer = new Map<string, Prepared[]>()
  for (const p of prepared) {
    if (!p.key) continue
    if (!byAnswer.has(p.key)) byAnswer.set(p.key, [])
    byAnswer.get(p.key)!.push(p)
  }

  const flagged = Object.fromEntries(THRESHOLDS.map(t => [t, 0])) as Record<number, number>
  const textOnly = Object.fromEntries(THRESHOLDS.map(t => [t, 0])) as Record<number, number>
  let answerCollisions = 0
  const samples: Array<{ score: number; a: Prepared; b: Prepared }> = []

  // Signal 1 + 2 combined: same answer, then scored on text.
  for (const group of byAnswer.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        answerCollisions++
        const score = similarity(group[i].grams, group[j].grams)
        for (const t of THRESHOLDS) if (score >= t) flagged[t]++
        if (samples.length < MAX_SAMPLES_PER_CATEGORY && score >= sampleThreshold) {
          samples.push({ score, a: group[i], b: group[j] })
        }
      }
    }
  }

  // Signal 2 alone, for comparison — this is the column that shows why text
  // similarity cannot be used on its own.
  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      const score = similarity(prepared[i].grams, prepared[j].grams)
      for (const t of THRESHOLDS) if (score >= t) textOnly[t]++
    }
  }

  return { total: prepared.length, flagged, textOnly, answerCollisions, samples }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const all = await fetchAllQuestions()

if (all.length === 0) {
  console.log('Question bank is empty — nothing to audit.')
  process.exit(0)
}

const byCategory = new Map<string, Record<string, string>[]>()
for (const q of all) {
  if (!byCategory.has(q.category)) byCategory.set(q.category, [])
  byCategory.get(q.category)!.push(q)
}

console.log(`\nAuditing ${all.length} active questions across ${byCategory.size} categories.`)
console.log('Pairs are compared within a category, across difficulties — the same')
console.log('fact filed as easy and as medium is still a repeat to the player.\n')

const widths = [22, 8, 12, ...THRESHOLDS.map(() => 8)]
const line = (cells: (string | number)[]) => cells.map((c, i) => String(c).padEnd(widths[i])).join('')
const rule = '-'.repeat(widths.reduce((a, b) => a + b, 0))

console.log(line(['category', 'count', 'same-answer', ...THRESHOLDS.map(t => `>=${t}`)]))
console.log(rule)

const totals = {
  count: 0,
  answerCollisions: 0,
  flagged: Object.fromEntries(THRESHOLDS.map(t => [t, 0])) as Record<number, number>,
  textOnly: Object.fromEntries(THRESHOLDS.map(t => [t, 0])) as Record<number, number>,
}
const allSamples: Array<{ score: number; a: Prepared; b: Prepared; category: string }> = []

for (const [category, questions] of [...byCategory.entries()].sort()) {
  const r = analyzeCategory(questions)
  console.log(line([category, r.total, r.answerCollisions, ...THRESHOLDS.map(t => r.flagged[t])]))

  totals.count += r.total
  totals.answerCollisions += r.answerCollisions
  for (const t of THRESHOLDS) {
    totals.flagged[t] += r.flagged[t]
    totals.textOnly[t] += r.textOnly[t]
  }
  allSamples.push(...r.samples.map(s => ({ ...s, category })))
}

console.log(rule)
console.log(line(['TOTAL', totals.count, totals.answerCollisions, ...THRESHOLDS.map(t => totals.flagged[t])]))

console.log(`\nText similarity alone, ignoring the answer (why the gate is needed):`)
console.log(line(['', '', '', ...THRESHOLDS.map(t => totals.textOnly[t])]))

console.log(`
Reading this:
  The threshold columns count pairs that share a normalized correct answer AND
  score at or above that text similarity. That pairing is the rejection rule.

  The last row counts pairs at the same similarity ignoring the answer. It runs
  far higher because trivia questions in a category are phrased alike:
  "Which element has the symbol Au?" and "...Ag?" score 0.88 while being
  completely different questions. Similarity on its own cannot separate a
  duplicate from a sibling; the shared answer is what makes it evidence.

  Known gap: an inverted pair ("symbol for gold?" -> Au versus "which element
  is Au?" -> gold) has different answers and slips the gate. Closing that needs
  embeddings, and is only worth it if these numbers say lexical matching is
  leaving too much behind.
`)

if (showSamples) {
  console.log(`\nSample flagged pairs scoring >= ${sampleThreshold}:\n`)
  const sorted = allSamples.sort((x, y) => y.score - x.score).slice(0, 40)
  for (const s of sorted) {
    console.log(`[${s.category}] score ${s.score.toFixed(3)} — both answer "${s.a.answer}"`)
    console.log(`  A (${s.a.difficulty}): ${s.a.text}`)
    console.log(`  B (${s.b.difficulty}): ${s.b.text}\n`)
  }
  if (sorted.length === 0) console.log('  (none)\n')
} else {
  console.log('Re-run with --samples to read example pairs.\n')
}
