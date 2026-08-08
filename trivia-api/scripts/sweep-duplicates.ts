#!/usr/bin/env vite-node
/**
 * Deactivate near-duplicate questions already in the live bank.
 *
 * Usage:
 *   npm run sweep:duplicates                              # dry run
 *   npm run sweep:duplicates -- --samples                 # dry run + read the borderline pairs
 *   npm run sweep:duplicates -- --category=music
 *   npm run sweep:duplicates -- --threshold=0.6
 *   npm run sweep:duplicates -- --no-ai                   # lexical rule only, no adjudication
 *   npm run sweep:duplicates -- --apply                   # actually write
 *
 * Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY from
 * .env.local or env.
 *
 * Nothing is written without --apply, and --apply only ever sets
 * is_active = false. Rows are never deleted: rounds, scores and
 * user_category_stats reference these ids, which is the same reason the
 * category retirements (20240068, 20240069, 20240074, 20240075) deactivate
 * rather than drop.
 *
 * Three stages:
 *   1. find_bank_near_duplicates (SQL) proposes pairs, so the bank is judged by
 *      the same pg_trgm rule that rejects new questions.
 *   2. Each proposed pair is adjudicated by the model, because a shared answer
 *      does not imply redundancy bank-to-bank — see duplicateAdjudicator.ts.
 *      Verdicts are cached in dedup-adjudications.json; a re-run costs nothing.
 *   3. Greedy survivor selection over the confirmed pairs only.
 *
 * Every run writes dedup-sweep-<timestamp>.json with each kept id, the ids it
 * displaced and their scores. That file is the audit trail and rollback source.
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NEAR_DUPLICATE_THRESHOLD } from '../supabase/src/openai/similarity.ts'
import { selectSurvivors, type BankRow, type DuplicatePair } from '../supabase/src/questions/bankDedup.ts'
import {
  DUPLICATE_ADJUDICATION_SCHEMA,
  DUPLICATE_ADJUDICATION_SYSTEM_PROMPT,
  buildAdjudicationPrompt,
  confirmsDuplicate,
  parseAdjudication,
  type AdjudicationResult,
} from '../supabase/src/openai/duplicateAdjudicator.ts'

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
const apply = args.includes('--apply')
const showSamples = args.includes('--samples')
const skipAi = args.includes('--no-ai')
const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1] ?? null
const threshold = Number(args.find(a => a.startsWith('--threshold='))?.split('=')[1] ?? NEAR_DUPLICATE_THRESHOLD)

if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
  console.error(`ERROR: --threshold must be between 0 and 1, got ${threshold}`)
  process.exit(1)
}

const PAGE_SIZE = 1000
const UPDATE_CHUNK = 200
const SAMPLE_COUNT = 15
const AI_CONCURRENCY = 8
const ADJUDICATION_CACHE = resolve(__dirname, '../dedup-adjudications.json')
const OPENAI_KEY = process.env.OPENAI_API_KEY
const ADJUDICATION_MODEL = process.env.DEDUP_ADJUDICATION_MODEL || 'gpt-4o-mini'

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

// ---------------------------------------------------------------------------
// Fetch, paging past PostgREST's row cap in both directions
// ---------------------------------------------------------------------------
/**
 * The RPC aggregates server-side and returns one JSONB array, so there is no
 * paging here. A set-returning version would be silently capped at PostgREST's
 * max-rows (1,000) with Range ignored on RPC POST — it would look like it had
 * found every pair while hiding roughly half of them.
 */
async function fetchPairs(): Promise<DuplicatePair[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/find_bank_near_duplicates`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_threshold: threshold, p_category: categoryFilter }),
  })
  if (!res.ok) throw new Error(`find_bank_near_duplicates failed: ${res.status} ${await res.text()}`)

  return (await res.json()) as DuplicatePair[]
}

/** A bank row plus the normalized answer, which the adjudication prompt needs. */
type SweepRow = BankRow & { answer_key: string }

async function fetchBankRows(): Promise<Map<string, SweepRow>> {
  const columns =
    'id,category,difficulty,question_text,explanation,times_used,source,source_candidate_id,created_at,answer_key'
  const rows = new Map<string, SweepRow>()

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({ select: columns, is_active: 'eq.true', order: 'id' })
    if (categoryFilter) params.set('category', `eq.${categoryFilter}`)

    const res = await fetch(`${SUPABASE_URL}/rest/v1/question_bank?${params}`, {
      headers: { ...headers, Range: `${offset}-${offset + PAGE_SIZE - 1}` },
    })
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`)

    const page = (await res.json()) as SweepRow[]
    for (const row of page) rows.set(row.id, row)
    if (page.length < PAGE_SIZE) break
  }

  return rows
}

// ---------------------------------------------------------------------------
// Adjudication — the model decides whether a proposed pair is really redundant
// ---------------------------------------------------------------------------
type Verdict = AdjudicationResult & { error?: string }

function pairKey(pair: DuplicatePair): string {
  return `${pair.aId}|${pair.bId}`
}

function loadCache(): Record<string, Verdict> {
  if (!existsSync(ADJUDICATION_CACHE)) return {}
  try {
    return JSON.parse(readFileSync(ADJUDICATION_CACHE, 'utf8')) as Record<string, Verdict>
  } catch {
    console.warn('WARNING: adjudication cache is unreadable, starting fresh')
    return {}
  }
}

async function askOpenAI(userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: ADJUDICATION_MODEL,
      messages: [
        { role: 'system', content: DUPLICATE_ADJUDICATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'trivia_duplicate_adjudication', strict: true, schema: DUPLICATE_ADJUDICATION_SCHEMA },
      },
      temperature: 0,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')
  return content
}

/**
 * Fills in verdicts for any pair the cache does not already hold, then persists
 * the cache. A failure is recorded as a non-duplicate so the pair is kept: a
 * missed duplicate resurfaces in the audit, a wrong drop is a good question
 * silently gone.
 */
async function adjudicate(pairs: DuplicatePair[], rowsById: Map<string, SweepRow>): Promise<Record<string, Verdict>> {
  const cache = loadCache()
  const pending = pairs.filter(p => !(pairKey(p) in cache))

  if (pending.length === 0) {
    console.log(`All ${pairs.length} pairs already adjudicated (cached).`)
    return cache
  }
  if (!OPENAI_KEY) {
    console.error('ERROR: OPENAI_API_KEY is required to adjudicate. Use --no-ai to skip (lexical rule only).')
    process.exit(1)
  }

  console.log(`Adjudicating ${pending.length} pairs with ${ADJUDICATION_MODEL} (${pairs.length - pending.length} cached)...`)

  let done = 0
  let index = 0
  // Checkpoint as we go. A run of this size takes minutes; losing every verdict
  // to a Ctrl-C or a dropped connection would mean paying for them all again.
  const flush = () => writeFileSync(ADJUDICATION_CACHE, JSON.stringify(cache, null, 2))

  async function worker(): Promise<void> {
    while (index < pending.length) {
      const pair = pending[index++]
      const a = rowsById.get(pair.aId)
      const b = rowsById.get(pair.bId)
      if (!a || !b) continue

      try {
        const raw = await askOpenAI(
          buildAdjudicationPrompt({ category: a.category, answer: a.answer_key, textA: a.question_text, textB: b.question_text })
        )
        cache[pairKey(pair)] = parseAdjudication(raw)
      } catch (error) {
        cache[pairKey(pair)] = {
          duplicate: false,
          confidence: 0,
          reason: 'adjudication failed',
          error: error instanceof Error ? error.message : String(error),
        }
      }
      done++
      if (done % 25 === 0) {
        process.stdout.write(`  ${done}/${pending.length}\r`)
        flush()
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(AI_CONCURRENCY, pending.length) }, worker))
  process.stdout.write(`  ${done}/${pending.length}\n`)

  flush()
  console.log(`Verdicts cached in ${ADJUDICATION_CACHE}`)
  return cache
}

async function deactivate(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += UPDATE_CHUNK) {
    const chunk = ids.slice(i, i + UPDATE_CHUNK)
    const params = new URLSearchParams({ id: `in.(${chunk.join(',')})` })
    const res = await fetch(`${SUPABASE_URL}/rest/v1/question_bank?${params}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ is_active: false }),
    })
    if (!res.ok) throw new Error(`Deactivation failed: ${res.status} ${await res.text()}`)
    process.stdout.write(`  deactivated ${Math.min(i + UPDATE_CHUNK, ids.length)}/${ids.length}\r`)
  }
  process.stdout.write('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`\nSweeping near-duplicates at threshold ${threshold}${categoryFilter ? ` in ${categoryFilter}` : ''}.`)
console.log(apply ? 'MODE: apply — rows will be deactivated.\n' : 'MODE: dry run — nothing will be written.\n')

const [pairs, rowsById] = await Promise.all([fetchPairs(), fetchBankRows()])
console.log(`Lexical rule proposed ${pairs.length} candidate pairs across ${rowsById.size} active questions.`)

// A shared answer plus high similarity is a proposal, not a verdict: the same
// template filled with different subjects lands in this set too. Confirm each
// pair before anything is dropped on the strength of it.
let confirmedPairs = pairs
if (skipAi) {
  console.log('Skipping adjudication (--no-ai): every proposed pair is treated as a duplicate.')
} else {
  const verdicts = await adjudicate(pairs, rowsById)
  confirmedPairs = pairs.filter(p => {
    const verdict = verdicts[pairKey(p)]
    return verdict ? confirmsDuplicate(verdict) : false
  })
  const rejected = pairs.length - confirmedPairs.length
  const failed = Object.values(verdicts).filter(v => v.error).length
  console.log(
    `Adjudication confirmed ${confirmedPairs.length} pairs and rejected ${rejected} as different questions sharing an answer` +
      (failed > 0 ? ` (${failed} calls failed and were kept)` : '') +
      '.'
  )
}

const groups = selectSurvivors(confirmedPairs, rowsById)
const dropIds = groups.flatMap(g => g.drop.map(d => d.row.id))

if (groups.length === 0) {
  console.log('\nNothing to resolve — the bank is clean at this threshold.\n')
  process.exit(0)
}

// Per-category breakdown
const perCategory = new Map<string, { groups: number; drops: number; active: number }>()
for (const row of rowsById.values()) {
  const entry = perCategory.get(row.category) ?? { groups: 0, drops: 0, active: 0 }
  entry.active++
  perCategory.set(row.category, entry)
}
for (const group of groups) {
  const entry = perCategory.get(group.keep.category)!
  entry.groups++
  entry.drops += group.drop.length
}

const widths = [22, 10, 12, 14, 12]
const line = (cells: (string | number)[]) => cells.map((c, i) => String(c).padEnd(widths[i])).join('')
const rule = '-'.repeat(widths.reduce((a, b) => a + b, 0))

console.log(`\n${line(['category', 'active', 'survivors', 'deactivate', 'remaining'])}`)
console.log(rule)
for (const [category, e] of [...perCategory.entries()].sort((a, b) => b[1].drops - a[1].drops)) {
  if (e.drops === 0) continue
  console.log(line([category, e.active, e.groups, e.drops, e.active - e.drops]))
}
console.log(rule)
console.log(line(['TOTAL', rowsById.size, groups.length, dropIds.length, rowsById.size - dropIds.length]))

// ---------------------------------------------------------------------------
// Report file — the rollback source
// ---------------------------------------------------------------------------
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const reportPath = resolve(__dirname, `../dedup-sweep-${stamp}.json`)

writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      threshold,
      category: categoryFilter,
      applied: apply,
      adjudicated: !skipAi,
      totals: {
        proposedPairs: pairs.length,
        confirmedPairs: confirmedPairs.length,
        survivors: groups.length,
        deactivated: dropIds.length,
      },
      groups: groups.map(g => ({
        category: g.keep.category,
        keep: { id: g.keep.id, text: g.keep.question_text },
        drop: g.drop.map(d => ({ id: d.row.id, text: d.row.question_text, score: d.score })),
      })),
    },
    null,
    2
  )
)
console.log(`\nReport written to ${reportPath}`)

// ---------------------------------------------------------------------------
// Samples — lowest scoring first, because those are the likeliest false positives
// ---------------------------------------------------------------------------
if (showSamples) {
  const flat = groups.flatMap(g =>
    g.drop.map(d => ({
      category: g.keep.category,
      keep: g.keep.question_text,
      drop: d.row.question_text,
      score: d.score,
    }))
  )
  console.log(`\nLowest-scoring drops (most likely false positives), ${SAMPLE_COUNT} of ${flat.length}:\n`)
  for (const s of flat.sort((a, b) => a.score - b.score).slice(0, SAMPLE_COUNT)) {
    console.log(`[${s.category}] ${s.score.toFixed(3)}`)
    console.log(`  KEEP ${s.keep}`)
    console.log(`  DROP ${s.drop}\n`)
  }
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------
if (!apply) {
  console.log('\nDry run. Re-run with --apply to deactivate the rows above.\n')
  process.exit(0)
}

console.log(`\nDeactivating ${dropIds.length} questions...`)
await deactivate(dropIds)
console.log(`Done. ${rowsById.size - dropIds.length} questions remain active.`)
console.log(`Rollback: set is_active = true for the drop ids in ${reportPath}\n`)
