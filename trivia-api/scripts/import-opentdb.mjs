#!/usr/bin/env node
/**
 * Import questions from Open Trivia Database into question_bank.
 *
 * Usage:
 *   node scripts/import-opentdb.mjs
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local or env.
 *
 * OTDB is free, no API key required. Max 50 questions per request.
 * Requests are spaced 1.5s apart to stay within rate limits.
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

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
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
}

const DIFFICULTIES = ['easy', 'medium', 'hard']
const OTDB_BASE = 'https://opentdb.com/api.php'
const REQUEST_DELAY_MS = 6000 // OTDB rate limit: 1 req/5s; 6s gives headroom
const BATCH_SIZE = 50         // OTDB max per request

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

async function fetchOTDB(categoryId, difficulty, token) {
  const url = `${OTDB_BASE}?amount=${BATCH_SIZE}&category=${categoryId}&difficulty=${difficulty}&type=multiple&token=${token}&encode=url3986`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OTDB fetch failed: ${res.status}`)
  return res.json()
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Supabase upsert (ignore duplicates via content_hash unique constraint)
// ---------------------------------------------------------------------------
async function upsertToSupabase(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/question_bank?on_conflict=content_hash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase error ${res.status}: ${text}`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Requesting OTDB session token...')
  const token = await getSessionToken()
  console.log('Token acquired.\n')

  let grandTotal = 0
  const summary = []

  for (const [ourCategory, otdbIds] of Object.entries(CATEGORY_MAP)) {
    for (const difficulty of DIFFICULTIES) {
      const rows = []

      for (const otdbId of otdbIds) {
        await sleep(REQUEST_DELAY_MS)

        let data
        try {
          data = await fetchOTDB(otdbId, difficulty, token)
        } catch (err) {
          console.warn(`  WARN [${ourCategory}/${difficulty}] cat=${otdbId}: fetch error — ${err.message}`)
          continue
        }

        // Response codes: 0=ok, 1=no results, 4=token empty (bucket exhausted)
        if (data.response_code === 1 || data.response_code === 4) {
          console.log(`  [${ourCategory}/${difficulty}] cat=${otdbId}: no questions available (code ${data.response_code})`)
          continue
        }
        if (data.response_code !== 0) {
          console.warn(`  WARN [${ourCategory}/${difficulty}] cat=${otdbId}: unexpected code ${data.response_code}`)
          continue
        }

        for (const q of data.results) {
          const questionText = decodeURIComponent(q.question)
          const correctAnswer = decodeURIComponent(q.correct_answer)
          const incorrects = q.incorrect_answers.map(decodeURIComponent)

          const options = buildOptions(correctAnswer, incorrects)
          const content_hash = computeContentHash(questionText, correctAnswer)

          rows.push({
            category: ourCategory,
            difficulty,
            question_text: questionText,
            ...options,
            content_hash,
            source: 'opentdb',
            is_active: true,
          })
        }

        console.log(`  [${ourCategory}/${difficulty}] cat=${otdbId}: fetched ${data.results.length}`)
      }

      if (rows.length === 0) {
        summary.push({ ourCategory, difficulty, count: 0, status: 'skipped' })
        continue
      }

      try {
        await upsertToSupabase(rows)
        grandTotal += rows.length
        summary.push({ ourCategory, difficulty, count: rows.length, status: 'ok' })
        console.log(`  => inserted ${rows.length} into ${ourCategory}/${difficulty}\n`)
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
  console.log(`\nTotal upserted: ${grandTotal}`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
