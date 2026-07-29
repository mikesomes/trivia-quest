#!/usr/bin/env vite-node
/**
 * Review questions the quality signals have flagged.
 *
 * Usage:
 *   npm run review:questions                    # list the quarantine queue
 *   npm run review:questions -- --category=history
 *   npm run review:questions -- --reason=suspect_answer_key
 *   npm run review:questions -- --deactivate=<question-id>
 *   npm run review:questions -- --reclassify=<question-id> --to=medium
 *   npm run review:questions -- --keep=<question-id>
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local or env.
 *
 * Deliberately a CLI and not a dashboard. The queue is small, the decisions are
 * one-per-question, and a web app would be a second deployment surface to keep
 * alive for a job that is a handful of judgement calls a week.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const args = process.argv.slice(2)
const arg = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1]

const REASON_LABEL: Record<string, string> = {
  suspect_answer_key: 'Almost nobody gets this right — check the answer key',
  too_easy_for_hard: 'Marked hard, but nearly everyone gets it',
  too_hard_for_easy: 'Marked easy, but most people miss it',
}

async function patchQuestion(id: string, patch: Record<string, unknown>, what: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/question_bank?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  const rows = await res.json()
  if (rows.length === 0) {
    console.error(`No question with id ${id}`)
    process.exit(1)
  }
  console.log(`${what}: ${rows[0].question_text}`)
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const deactivateId = arg('deactivate')
if (deactivateId) {
  await patchQuestion(deactivateId, { is_active: false }, 'Deactivated')
  process.exit(0)
}

const reclassifyId = arg('reclassify')
if (reclassifyId) {
  const to = arg('to')
  if (!to || !['easy', 'medium', 'hard'].includes(to)) {
    console.error('--reclassify requires --to=easy|medium|hard')
    process.exit(1)
  }
  await patchQuestion(reclassifyId, { difficulty: to }, `Reclassified as ${to}`)
  process.exit(0)
}

const keepId = arg('keep')
if (keepId) {
  // Nothing to write — the queue is a view, so "keep" is just a no-op that
  // documents the decision. Recording review state would mean a new table and
  // a workflow; if the same question keeps reappearing, that is the signal.
  console.log(`Keeping ${keepId}. It will stay in the queue while it still trips a rule.`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Default: list the queue
// ---------------------------------------------------------------------------
const params = new URLSearchParams({ select: '*', order: 'times_answered.desc' })
const category = arg('category')
const reason = arg('reason')
if (category) params.set('category', `eq.${category}`)
if (reason) params.set('reason', `eq.${reason}`)

const res = await fetch(`${SUPABASE_URL}/rest/v1/question_quarantine?${params}`, { headers })
if (!res.ok) {
  const body = await res.text()
  console.error(`Failed to read quarantine view: ${res.status} ${body}`)
  if (res.status === 404) {
    console.error('\nThe question_quarantine view is missing — apply migration 20240067000000.')
  }
  process.exit(1)
}

const rows = (await res.json()) as Array<Record<string, string | number | null>>

if (rows.length === 0) {
  console.log('\nNothing in the review queue.')
  console.log('Questions need at least 30 answers before their rate counts as signal,')
  console.log('so an empty queue on a young bank means "not enough plays yet",')
  console.log('not "nothing wrong".\n')
  process.exit(0)
}

console.log(`\n${rows.length} question(s) to review:\n`)

for (const r of rows) {
  const rate = r.correct_rate === null ? 'n/a' : `${(Number(r.correct_rate) * 100).toFixed(1)}%`
  console.log(`${r.id}`)
  console.log(`  ${r.question_text}`)
  console.log(`  ${r.category} / ${r.difficulty} — ${rate} correct over ${r.times_answered} answers, ${r.flag_count} player flag(s)`)
  console.log(`  ${REASON_LABEL[String(r.reason)] ?? r.reason}`)
  console.log()
}

console.log('Act on one with:')
console.log('  npm run review:questions -- --deactivate=<id>')
console.log('  npm run review:questions -- --reclassify=<id> --to=medium')
console.log('  npm run review:questions -- --keep=<id>\n')
