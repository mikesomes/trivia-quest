#!/usr/bin/env node
/**
 * Generate and import NFL Football trivia questions using OpenAI.
 *
 * Usage:
 *   node scripts/import-nfl.mjs
 *
 * Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY from .env.local
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Load .env.local
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
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY   = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_KEY) {
  console.error('ERROR: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY must be set')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Topic batches — each prompt targets a specific NFL sub-topic for variety
// ---------------------------------------------------------------------------
const TOPICS = {
  easy: [
    'NFL team names, cities, and mascots',
    'Basic NFL rules, positions, and field markings',
    'Famous NFL Super Bowl winners and MVP awards',
    'Well-known NFL records (touchdowns, yards, games)',
    'Iconic NFL stadiums and their home teams',
  ],
  medium: [
    'NFL Draft history and notable first overall picks',
    'NFL coaches — Super Bowl winning coaches and their teams',
    'NFL quarterbacks — career stats, records, and achievements',
    'NFL history from the 1980s and 1990s dynasties',
    'NFL running backs and wide receivers — records and awards',
  ],
  hard: [
    'NFL salary cap rules, franchise tags, and contract history',
    'Obscure NFL records and single-game statistical achievements',
    'NFL history from the 1960s and 1970s, including the AFL merger',
    'Advanced NFL statistics — passer rating, DVOA, and playoff seeding rules',
    'NFL trades, free agency signings, and team relocations',
  ],
}

const QUESTIONS_PER_TOPIC = 15

function computeContentHash(questionText, correctAnswer) {
  const normalized = [questionText, correctAnswer]
    .join('|')
    .toLowerCase()
    .replace(/[^\w\s|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return createHash('sha256').update(normalized).digest('hex')
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function generateQuestions(difficulty, topic) {
  const prompt = `Generate ${QUESTIONS_PER_TOPIC} NFL Football trivia questions about: "${topic}".

Difficulty level: ${difficulty.toUpperCase()}
${difficulty === 'easy' ? '- Suitable for casual NFL fans. Answers are widely known.' : ''}
${difficulty === 'medium' ? '- Requires solid NFL knowledge. Covers specific stats and historical facts.' : ''}
${difficulty === 'hard' ? '- For hardcore NFL fans only. Obscure facts, specific numbers, detailed history.' : ''}

Rules:
- Each question must have exactly 4 answer options (A, B, C, D)
- Exactly one correct answer
- All options must be plausible — avoid obviously wrong answers
- Questions must be factually accurate
- Mix question styles: who, what, when, which, how many
- Do not repeat questions

Return a JSON array (no markdown, no backticks) with this exact structure:
[
  {
    "question": "...",
    "correct": "...",
    "incorrect": ["...", "...", "..."]
  }
]`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const content = data.choices[0].message.content

  // Handle both array and object-wrapped responses
  let parsed = JSON.parse(content)
  if (!Array.isArray(parsed)) {
    parsed = parsed.questions || parsed.trivia || Object.values(parsed)[0]
  }
  return parsed
}

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
  console.log(`Generating NFL Football questions using ${OPENAI_MODEL}...\n`)

  let grandTotal = 0
  const seenHashes = new Set()

  for (const [difficulty, topics] of Object.entries(TOPICS)) {
    const allRows = []

    for (const topic of topics) {
      console.log(`  [${difficulty}] "${topic}"`)
      await sleep(500)

      let questions
      try {
        questions = await generateQuestions(difficulty, topic)
      } catch (err) {
        console.warn(`    WARN: ${err.message}`)
        continue
      }

      if (!Array.isArray(questions)) {
        console.warn(`    WARN: unexpected response format`)
        continue
      }

      let count = 0
      for (const q of questions) {
        if (!q.question || !q.correct || !Array.isArray(q.incorrect) || q.incorrect.length < 3) continue
        if (q.question.length > 300 || q.correct.length > 150) continue
        if (q.incorrect.some(a => !a || a.length > 150)) continue

        const hash = computeContentHash(q.question, q.correct)
        if (seenHashes.has(hash)) continue
        seenHashes.add(hash)

        const options = buildOptions(q.correct, q.incorrect.slice(0, 3))
        allRows.push({
          category: 'nfl_football',
          difficulty,
          question_text: q.question.trim(),
          ...options,
          content_hash: hash,
          source: 'openai',
          is_active: true,
        })
        count++
      }
      console.log(`    → ${count} valid questions`)
    }

    if (allRows.length === 0) {
      console.log(`  Skipping ${difficulty} — no valid rows\n`)
      continue
    }

    try {
      await upsertToSupabase(allRows)
      grandTotal += allRows.length
      console.log(`  ✓ Inserted up to ${allRows.length} ${difficulty} questions\n`)
    } catch (err) {
      console.error(`  ✗ Supabase error for ${difficulty}: ${err.message}\n`)
    }
  }

  console.log(`=== Done — ${grandTotal} NFL questions imported ===`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
