#!/usr/bin/env vite-node
/**
 * Inserts a resettable, development-only batch for manual review practice.
 * Refuses to run unless ALLOW_DEVELOPMENT_CANDIDATE_SEED=true is set.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(scriptDir, '../.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equals = trimmed.indexOf('=')
    if (equals === -1) continue
    const key = trimmed.slice(0, equals).trim()
    const value = trimmed.slice(equals + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

if (process.env.ALLOW_DEVELOPMENT_CANDIDATE_SEED !== 'true') {
  console.error('Refusing to seed. Set ALLOW_DEVELOPMENT_CANDIDATE_SEED=true for a local development environment.')
  process.exit(1)
}
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const batchId = '00000000-0000-4000-8000-000000000001'
const fixture = (id: string, category: string, difficulty: string, rating: number, question: string, choices: string[], correctIndex: number, explanation: string, tags: string[]) => ({
  id,
  category,
  difficulty,
  difficulty_rating: rating,
  question_text: question,
  choices,
  correct_answer_index: correctIndex,
  correct_answer: choices[correctIndex],
  explanation,
  tags,
  generation_batch_id: batchId,
  generation_seed: 'manual-review-test-001',
  generator_model: 'development-fixture',
  editorial_status: 'pending',
  verification_status: 'unverified',
})

const candidates = [
  fixture('10000000-0000-4000-8000-000000000001', 'science', 'easy', 3,
    'Which planet is known as the Red Planet?', ['Earth', 'Mars', 'Jupiter', 'Venus'], 1,
    'Mars appears reddish because iron minerals in its soil oxidize.', ['astronomy']),
  fixture('10000000-0000-4000-8000-000000000002', 'history', 'medium', 6,
    'Which treaty formally ended World War I?', ['Treaty of Versailles', 'Treaty of Paris', 'Treaty of Tordesillas', 'Treaty of Utrecht'], 0,
    'The Treaty of Versailles was signed in 1919 and formally ended the war between Germany and the Allied Powers.', ['world-war-i']),
  fixture('10000000-0000-4000-8000-000000000003', 'geography', 'hard', 9,
    'Which country has the longest coastline in the world?', ['Russia', 'Indonesia', 'Canada', 'Australia'], 2,
    'Canada has the world’s longest coastline, bordering the Atlantic, Pacific, and Arctic oceans.', ['coastlines']),
  fixture('10000000-0000-4000-8000-000000000004', 'general_knowledge', 'easy', 2,
    'What is the best color?', ['Blue', 'Red', 'Green', 'Yellow'], 0,
    'This deliberately subjective question is a fixture that should be rejected as ambiguous.', ['ambiguous-fixture']),
  fixture('10000000-0000-4000-8000-000000000005', 'science', 'easy', 1,
    'What is 2 + 2?', ['4', '4.1', '4.01', '4.001'], 0,
    'This fixture has obviously weak distractors and should be marked for revision.', ['weak-distractors-fixture']),
]

const response = await fetch(`${supabaseUrl}/rest/v1/question_candidates?on_conflict=id`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify(candidates),
})
if (!response.ok) {
  console.error(`Failed to seed candidates: ${response.status} ${await response.text()}`)
  process.exit(1)
}
console.log(`Seeded ${candidates.length} development candidates in batch manual-review-test-001 (${batchId}).`)
