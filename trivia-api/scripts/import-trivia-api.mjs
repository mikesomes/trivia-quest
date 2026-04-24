#!/usr/bin/env node
/**
 * Import questions from The Trivia API (the-trivia-api.com) into question_bank.
 *
 * Usage:
 *   node scripts/import-trivia-api.mjs
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local or env.
 *
 * Free, no API key required. Max 50 questions per request.
 * Requests are spaced 1.5s apart to be a good citizen.
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
// The Trivia API category slugs mapped to our categories.
// Passing multiple slugs in one request broadens the pool.
// ---------------------------------------------------------------------------
const CATEGORY_MAP = {
  general_knowledge: ['general_knowledge', 'society_and_culture'],
  history:           ['history'],
  science:           ['science', 'technology'],
  sports:            ['sport_and_leisure'],
  movies_tv:         ['film_and_tv', 'arts_and_literature'],
  geography:         ['geography'],
}

const DIFFICULTIES = ['easy', 'medium', 'hard']
const TRIVIA_API_BASE = 'https://the-trivia-api.com/v2/questions'
const REQUEST_DELAY_MS = 1500
const BATCH_SIZE = 50         // API max per request
const BATCHES_PER_BUCKET = 3  // requests per category/difficulty combo (150 questions attempted)

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
// The Trivia API fetch
// ---------------------------------------------------------------------------
async function fetchTriviaApi(categories, difficulty) {
  const params = new URLSearchParams({
    categories: categories.join(','),
    difficulties: difficulty,
    limit: String(BATCH_SIZE),
    types: 'text_choice',
  })
  const url = `${TRIVIA_API_BASE}?${params}`
  const res = await fetch(url, {
    headers: { 'X-Client': 'trivia-quest-importer' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from The Trivia API`)
  return res.json()
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Validate a raw question from the API
// ---------------------------------------------------------------------------
function isValidQuestion(q) {
  return (
    q &&
    typeof q.question?.text === 'string' &&
    q.question.text.length >= 10 &&
    typeof q.correctAnswer === 'string' &&
    q.correctAnswer.length > 0 &&
    Array.isArray(q.incorrectAnswers) &&
    q.incorrectAnswers.length === 3 &&
    q.incorrectAnswers.every(a => typeof a === 'string' && a.length > 0)
  )
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
  console.log('Starting import from The Trivia API...\n')

  let grandTotal = 0
  const summary = []

  for (const [ourCategory, triviaCategories] of Object.entries(CATEGORY_MAP)) {
    for (const difficulty of DIFFICULTIES) {
      const rows = []
      const seenHashes = new Set()

      for (let batch = 0; batch < BATCHES_PER_BUCKET; batch++) {
        await sleep(REQUEST_DELAY_MS)

        let questions
        try {
          questions = await fetchTriviaApi(triviaCategories, difficulty)
        } catch (err) {
          console.warn(`  WARN [${ourCategory}/${difficulty}] batch ${batch + 1}: ${err.message}`)
          continue
        }

        if (!Array.isArray(questions) || questions.length === 0) {
          console.log(`  [${ourCategory}/${difficulty}] batch ${batch + 1}: empty response`)
          break
        }

        let batchCount = 0
        for (const q of questions) {
          if (!isValidQuestion(q)) continue

          const questionText = q.question.text.trim()
          const correctAnswer = q.correctAnswer.trim()
          const incorrects = q.incorrectAnswers.map(a => a.trim())

          // Truncate options that exceed column limits
          if (
            questionText.length > 300 ||
            correctAnswer.length > 150 ||
            incorrects.some(a => a.length > 150)
          ) continue

          const content_hash = computeContentHash(questionText, correctAnswer)
          if (seenHashes.has(content_hash)) continue
          seenHashes.add(content_hash)

          const options = buildOptions(correctAnswer, incorrects)

          rows.push({
            category: ourCategory,
            difficulty,
            question_text: questionText,
            ...options,
            content_hash,
            source: 'trivia-api',
            is_active: true,
          })
          batchCount++
        }

        console.log(`  [${ourCategory}/${difficulty}] batch ${batch + 1}: ${batchCount} valid of ${questions.length} returned`)
      }

      if (rows.length === 0) {
        summary.push({ ourCategory, difficulty, count: 0, status: 'skipped' })
        continue
      }

      try {
        await upsertToSupabase(rows)
        grandTotal += rows.length
        summary.push({ ourCategory, difficulty, count: rows.length, status: 'ok' })
        console.log(`  => inserted up to ${rows.length} into ${ourCategory}/${difficulty}\n`)
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
  console.log(`\nTotal upserted (pre-dedup): ${grandTotal}`)
  console.log('Note: exact new rows may be lower if some questions already existed in question_bank.')
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
