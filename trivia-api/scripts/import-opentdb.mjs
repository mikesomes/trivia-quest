#!/usr/bin/env node
/**
 * Import questions from Open Trivia Database into question_bank.
 *
 * Usage:
 *   node scripts/import-opentdb.mjs                          # every mapped category
 *   node scripts/import-opentdb.mjs --category video_games   # one category
 *   node scripts/import-opentdb.mjs --category video_games --dry-run
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local or env.
 * --dry-run fetches from OTDB and reports what it would insert without
 * touching the database, so it needs neither variable.
 *
 * OTDB is free and needs no API key. Max 50 questions per request, so each
 * category/difficulty bucket is drained over several requests rather than
 * capped at one: a session token makes OTDB serve every question exactly once
 * and then report code 4, which is what tells us a bucket is exhausted. Near
 * the tail OTDB refuses a full batch it cannot fill, so the batch size steps
 * down (50 -> 25 -> 10 -> 5 -> 1) to scoop the remainder.
 *
 * Requests are spaced REQUEST_DELAY_MS apart to stay within rate limits, which
 * is what makes a full run take a while — the whole bank is ~1,200 questions
 * per large category, or roughly 25 requests per difficulty.
 *
 * Duplicate questions are silently ignored (content_hash unique constraint).
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const categoryFlag = args.indexOf('--category')
const ONLY_CATEGORY = categoryFlag !== -1 ? args[categoryFlag + 1] : null

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// OTDB category IDs mapped to our categories
// Multiple OTDB IDs per category are fetched and merged.
// ---------------------------------------------------------------------------
const CATEGORY_MAP = {
  general_knowledge: [9],
  history:           [23],
  science:           [17, 18], // Science & Nature + Science: Computers
  sports:            [21],
  movies_tv:         [11, 14], // Entertainment: Film + Entertainment: Television
  geography:         [22],
  video_games:       [15],     // Entertainment: Video Games
  music:             [12],     // Entertainment: Music
}

if (ONLY_CATEGORY && !CATEGORY_MAP[ONLY_CATEGORY]) {
  console.error(
    `ERROR: unknown category "${ONLY_CATEGORY}". Known: ${Object.keys(CATEGORY_MAP).join(', ')}`
  )
  process.exit(1)
}

const DIFFICULTIES = ['easy', 'medium', 'hard']
const OTDB_BASE = 'https://opentdb.com/api.php'
const REQUEST_DELAY_MS = 6000 // OTDB rate limit: 1 req/5s; 6s gives headroom
// OTDB caps a request at 50 and rejects a batch it cannot fill outright, so
// draining the tail of a bucket means asking for less. Descending order is
// what makes the walk terminate: once amount=1 comes back empty the bucket
// really is exhausted.
const BATCH_SIZES = [50, 25, 10, 5, 1]
const UPSERT_CHUNK = 200 // rows per POST, so a large bucket is not one huge body

// ---------------------------------------------------------------------------
// Content hash — must match deduplicator.ts exactly
// ---------------------------------------------------------------------------
function computeContentHash(questionText, correctAnswer) {
  const normalized = [questionText, correctAnswer]
    .join('|')
    .toLowerCase()
    .replace(/[^\w\s|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return createHash('sha256').update(normalized).digest('hex')
}

// ---------------------------------------------------------------------------
// Shuffle options so correct answer isn't always in position a
// ---------------------------------------------------------------------------
function buildOptions(correctAnswer, incorrectAnswers) {
  const all = [correctAnswer, ...incorrectAnswers]
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  const correctIdx = all.indexOf(correctAnswer)
  return {
    option_a: all[0],
    option_b: all[1],
    option_c: all[2],
    option_d: all[3],
    correct_option: ['a', 'b', 'c', 'd'][correctIdx],
  }
}

// ---------------------------------------------------------------------------
// OTDB API helpers
// ---------------------------------------------------------------------------
async function getSessionToken() {
  const res = await fetch('https://opentdb.com/api_token.php?command=request')
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`)
  const data = await res.json()
  return data.token
}

async function fetchOTDB(categoryId, difficulty, token, amount) {
  const url = `${OTDB_BASE}?amount=${amount}&category=${categoryId}&difficulty=${difficulty}&type=multiple&token=${token}&encode=url3986`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OTDB fetch failed: ${res.status}`)
  return res.json()
}

/**
 * How many questions OTDB holds for a category, per difficulty. Used only to
 * report progress against a known target — the drain loop stops on OTDB's own
 * exhaustion signal, not on this number, since the two can disagree when the
 * upstream bank changes mid-run.
 */
async function fetchAvailableCounts(categoryId) {
  try {
    const res = await fetch(`https://opentdb.com/api_count.php?category=${categoryId}`)
    if (!res.ok) return null
    const data = await res.json()
    const c = data.category_question_count
    return {
      easy: c.total_easy_question_count,
      medium: c.total_medium_question_count,
      hard: c.total_hard_question_count,
    }
  } catch {
    return null
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Supabase upsert (ignore duplicates via content_hash unique constraint)
// ---------------------------------------------------------------------------
async function upsertToSupabase(rows) {
  if (DRY_RUN) return

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/question_bank?on_conflict=content_hash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Supabase error ${res.status}: ${text}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Drain one OTDB category/difficulty bucket completely.
//
// The session token is what makes this terminate: OTDB serves each question at
// most once per token, so repeated requests walk the bucket instead of
// resampling it. A bucket is only declared empty once the smallest batch size
// comes back with nothing — see the response-code comment in the loop for why
// the obvious earlier exit drops questions.
// ---------------------------------------------------------------------------
async function drainBucket(ourCategory, otdbId, difficulty, token, seenHashes) {
  const rows = []
  let sizeIdx = 0

  while (sizeIdx < BATCH_SIZES.length) {
    const amount = BATCH_SIZES[sizeIdx]
    await sleep(REQUEST_DELAY_MS)

    let data
    try {
      data = await fetchOTDB(otdbId, difficulty, token, amount)
    } catch (err) {
      console.warn(`  WARN [${ourCategory}/${difficulty}] cat=${otdbId}: fetch error — ${err.message}`)
      sizeIdx++
      continue
    }

    // 0=ok, 1=not enough results for this amount, 4=token exhausted for query.
    //
    // Both 1 and 4 retire the current batch size rather than the bucket. OTDB
    // reports 4 both for "you have seen everything" and for "I cannot fill an
    // amount this large from what you have not seen", and the two are
    // indistinguishable in the response — so treating 4 as terminal would
    // silently drop up to BATCH_SIZES[0] - 1 questions off the tail of every
    // bucket. Stepping down costs a few wasted requests when the bucket really
    // is empty, and terminates either way because sizeIdx only ever advances.
    if (data.response_code === 1 || data.response_code === 4) {
      sizeIdx++
      continue
    }
    if (data.response_code !== 0) {
      console.warn(`  WARN [${ourCategory}/${difficulty}] cat=${otdbId}: unexpected code ${data.response_code}`)
      sizeIdx++
      continue
    }
    if (data.results.length === 0) {
      sizeIdx++
      continue
    }

    let added = 0
    for (const q of data.results) {
      const questionText = decodeURIComponent(q.question)
      const correctAnswer = decodeURIComponent(q.correct_answer)
      const incorrects = q.incorrect_answers.map(decodeURIComponent)

      const content_hash = computeContentHash(questionText, correctAnswer)
      // The token already rules out repeats within a run, but a category mapped
      // to several OTDB ids can legitimately serve the same question twice.
      if (seenHashes.has(content_hash)) continue
      seenHashes.add(content_hash)

      rows.push({
        category: ourCategory,
        difficulty,
        question_text: questionText,
        ...buildOptions(correctAnswer, incorrects),
        content_hash,
        source: 'opentdb',
        is_active: true,
      })
      added++
    }

    console.log(
      `  [${ourCategory}/${difficulty}] cat=${otdbId}: +${added} (asked ${amount}, got ${data.results.length}, bucket ${rows.length})`
    )
  }

  return rows
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const targets = ONLY_CATEGORY
    ? { [ONLY_CATEGORY]: CATEGORY_MAP[ONLY_CATEGORY] }
    : CATEGORY_MAP

  if (DRY_RUN) console.log('DRY RUN — fetching from OTDB, nothing will be written.\n')
  console.log(`Categories: ${Object.keys(targets).join(', ')}`)

  console.log('Requesting OTDB session token...')
  const token = await getSessionToken()
  console.log('Token acquired.\n')

  let grandTotal = 0
  const summary = []

  for (const [ourCategory, otdbIds] of Object.entries(targets)) {
    // Shared across difficulties so a question served under two OTDB ids is
    // only ever prepared once.
    const seenHashes = new Set()

    for (const otdbId of otdbIds) {
      const available = await fetchAvailableCounts(otdbId)
      if (available) {
        const total = available.easy + available.medium + available.hard
        console.log(
          `OTDB cat=${otdbId} holds ${total} questions ` +
          `(${available.easy} easy / ${available.medium} medium / ${available.hard} hard)`
        )
      }
    }

    for (const difficulty of DIFFICULTIES) {
      const rows = []
      for (const otdbId of otdbIds) {
        rows.push(...await drainBucket(ourCategory, otdbId, difficulty, token, seenHashes))
      }

      if (rows.length === 0) {
        summary.push({ ourCategory, difficulty, count: 0, status: 'skipped' })
        continue
      }

      try {
        await upsertToSupabase(rows)
        grandTotal += rows.length
        summary.push({ ourCategory, difficulty, count: rows.length, status: 'ok' })
        console.log(`  => ${DRY_RUN ? 'would insert' : 'inserted'} ${rows.length} into ${ourCategory}/${difficulty}\n`)
      } catch (err) {
        summary.push({ ourCategory, difficulty, count: 0, status: 'error', error: err.message })
        console.error(`  => ERROR ${ourCategory}/${difficulty}: ${err.message}\n`)
      }
    }
  }

  console.log('=== Summary ===')
  for (const r of summary) {
    const icon = r.status === 'ok' ? '✓' : r.status === 'skipped' ? '-' : '✗'
    const detail = r.status === 'error' ? ` (${r.error})` : ''
    console.log(`${icon}  ${r.ourCategory.padEnd(20)} ${r.difficulty.padEnd(8)} ${r.count}${detail}`)
  }
  console.log(`\nTotal ${DRY_RUN ? 'that would be upserted' : 'upserted'}: ${grandTotal}`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
