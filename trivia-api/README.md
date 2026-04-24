# trivia-api — Backend for Trivia Quest

Supabase Edge Functions (Deno/TypeScript) + PostgreSQL database + OpenAI question generation. Serves as the complete backend for the Trivia Quest mobile game.

All game logic — answer validation, XP calculation, leaderboard ranking — runs server-side. The client is never trusted for XP values.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [XP & Level System](#xp--level-system)
- [Customization Guide](#customization-guide)
- [Post-MVP TODOs](#post-mvp-todos)

---

## Architecture Overview

```
Mobile App (Expo)
      │
      │  JWT (Supabase anon key)
      ▼
Supabase Edge Functions  ──────►  PostgreSQL (RLS-enabled)
  (Deno runtime)                  └── question_bank
      │                           └── rounds
      │  OpenAI API calls         └── round_questions
      ▼                           └── answers
  gpt-4o-mini                     └── scores
  (question gen only)             └── users
                                  └── leaderboard_all_time (view)
                                  └── leaderboard_weekly (view)
```

**Key design decisions:**

- **All API endpoints are Supabase Edge Functions** running on Deno. No separate Node/Express server to manage.
- **Database: PostgreSQL via Supabase** with Row Level Security (RLS) enabled on every table. Direct client database access is restricted; all mutations go through Edge Functions using the service role key.
- **Auth: Supabase anonymous auth.** Players get a JWT automatically on first launch — no email or password required for the MVP. The JWT is passed as a Bearer token on every request.
- **Question generation: OpenAI gpt-4o-mini** with structured JSON output via the responses API. Questions are generated in batches and stored in `question_bank`. Generation is decoupled from gameplay — a cron job tops up the bank when it falls below `QUESTION_BANK_MIN` (30) questions per category/difficulty combination.
- **XP validation: All gameplay XP is computed server-side** in `supabase/functions/_shared/scoring.ts`. The client sends only `roundId`, `selectedOption`, and `timeTakenMs`. XP is never accepted from the client.
- **Content deduplication:** Each question is hashed (SHA-256 of normalized question text) before insert. The `content_hash` column has a UNIQUE constraint, so duplicate questions from OpenAI are silently dropped.

---

## Database Schema

### Tables

| Table | Description |
|---|---|
| `users` | One row per player. Mirrors `auth.users`, populated by a trigger on signup. Stores level, XP, lifetime stats. |
| `question_bank` | All generated trivia questions. Stores question text, four options (a–d), correct option, explanation, category, difficulty, and a `content_hash` for deduplication. |
| `rounds` | One row per game session. Tracks status (`active` / `completed` / `abandoned`), current question index, round XP, streak, lives remaining, and an `expires_at` timestamp (15 minutes from creation). |
| `round_questions` | Junction table: 10 rows per round linking `rounds` to `question_bank` with a `position` (0–9). |
| `answers` | One row per submitted answer. Stores correctness, time taken, XP awarded, and breakdown (speed / streak bonus). |
| `scores` | Historical table name for round XP submissions. One row per round. Used as the source of truth for leaderboards. |

### Views

| View | Description |
|---|---|
| `leaderboard_all_time` | Aggregates XP submissions joined with `users`, ordered by `session_xp_earned` descending. Used by the all-time leaderboard. |
| `leaderboard_weekly` | Same as above but filtered to `completed_at >= date_trunc('week', now())`. |

### Relationships

```
users ──< rounds ──< round_questions >── question_bank
              └──< answers >── question_bank
              └──< scores
```

### Migrations

Migrations live in `supabase/migrations/` and are applied in order:

| File | Description |
|---|---|
| `20240001000000_init_schema.sql` | Creates all tables, constraints, and leaderboard views |
| `20240002000000_rls_policies.sql` | RLS policies: users can only read/write their own data |
| `20240003000000_indexes.sql` | Performance indexes on foreign keys and leaderboard columns |
| `20240004000000_db_functions.sql` | PostgreSQL helper functions (e.g., question selection, trigger for user creation) |

---

## API Endpoints

All endpoints are deployed as Supabase Edge Functions under:
`https://<project-ref>.supabase.co/functions/v1/<endpoint-name>`

Every endpoint requires a valid Supabase JWT in the `Authorization: Bearer <token>` header unless otherwise noted.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/create-round` | JWT | Creates a round, randomly selects 10 questions from the bank for the given category/difficulty, returns `roundId` and first question. |
| GET | `/get-round-questions?roundId=<id>` | JWT | Returns all 10 questions for the round. Correct answers are omitted from the response — the client only receives `option_a` through `option_d` and question text. |
| POST | `/submit-answer` | JWT | Validates the player's answer server-side, computes answer XP, updates round state (streak, lives, round XP, question index), and returns correctness + XP breakdown. |
| POST | `/finish-round` | JWT | Marks the round as `completed` (or `abandoned` if called with no answers). Returns a full round summary. |
| POST | `/submit-xp` | JWT | Persists round XP to the historical `scores` table, awards XP, recomputes level, updates the user's best XP if applicable, and returns the player's new rank. |
| GET | `/get-leaderboard?period=weekly\|alltime` | JWT | Returns the top 100 entries from the appropriate leaderboard view, plus the current user's rank if they are not in the top 100. |
| GET | `/get-profile` | JWT | Returns the current user's full stats: level, XP, XP to next level, total games, total correct, best XP. |
| POST | `/generate-questions` | `CRON_SECRET` or `SERVICE_KEY` | Calls OpenAI to generate questions and insert them into `question_bank`. Accepts `{ category?, difficulty?, count?, topUpAll? }`. Not exposed to players — intended for cron jobs and manual admin use only. |

### Request/Response examples

**POST /create-round**
```json
// Request
{ "category": "science", "difficulty": "medium" }

// Response
{
  "roundId": "uuid",
  "question": {
    "id": "uuid",
    "position": 0,
    "question_text": "What is the atomic number of carbon?",
    "option_a": "4",
    "option_b": "6",
    "option_c": "8",
    "option_d": "12"
  },
  "livesRemaining": 3,
  "xpEarnedInRound": 0,
  "streak": 0
}
```

**POST /submit-answer**
```json
// Request
{ "roundId": "uuid", "questionId": "uuid", "selectedOption": "b", "timeTakenMs": 4200 }

// Response
{
  "isCorrect": true,
  "xpAwarded": 24,
  "xpBreakdown": { "base": 10, "timeBonus": 4, "difficultyBonus": 5, "streakBonus": 5 },
  "newStreak": 4,
  "livesRemaining": 3,
  "currentRoundXp": 24,
  "nextQuestion": { ... } // null if round is over
}
```

---

## Prerequisites

- **Node.js 20+** — for running tests and dev tooling
- **Supabase CLI** — manages local Postgres, Edge Functions runtime, and migrations
  ```
  brew install supabase/tap/supabase
  ```
- **A Supabase project** (free tier works) — https://supabase.com
- **OpenAI API key** — https://platform.openai.com (gpt-4o-mini is inexpensive; generating a full question bank costs roughly $0.10–$0.50)
- **Deno** — used internally by the Supabase CLI for Edge Functions. You do not need to install it separately unless you want to run functions outside the CLI.

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development. For production, use `supabase secrets set` (see [Deployment](#deployment)).

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL, e.g. `https://abcdef.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS). Never expose to clients. Found in Supabase dashboard → Settings → API. |
| `SUPABASE_ANON_KEY` | Public anon key. Safe to expose. Used by the mobile app. |
| `OPENAI_API_KEY` | OpenAI secret key (`sk-...`). Used only by `generate-questions`. |
| `OPENAI_MODEL` | OpenAI model to use for generation. Default: `gpt-4o-mini`. Change to `gpt-4o` for higher quality questions at higher cost. |
| `QUESTION_BANK_MIN_THRESHOLD` | Minimum questions per category/difficulty before a top-up is triggered. Default: `30`. |
| `QUESTION_BANK_TOPUP_COUNT` | How many questions to generate per batch when topping up. Default: `15`. |
| `CRON_SECRET` | A random secret string you generate. Used to authenticate calls to `generate-questions` from a cron job. Generate with: `openssl rand -hex 32` |
| `APP_ENV` | `development` or `production`. Controls logging verbosity. |
| `EXPO_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` — included here so `.env.example` can serve both repos. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY`. |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL for Edge Function calls, e.g. `https://abcdef.supabase.co/functions/v1` |
| `EXPO_PUBLIC_APP_ENV` | `development` or `production`. |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` must never be committed to version control or included in mobile app builds. They are server-only secrets.

---

## Local Development

### 1. Clone the repo

```bash
git clone <repo-url>
cd trivia-app/trivia-api
```

### 2. Install dev dependencies

```bash
npm install
```

### 3. Start the local Supabase stack

The `supabase` directory is already initialized. Run:

```bash
supabase start
```

This starts a local PostgreSQL instance (port 54322), the Edge Functions runtime (port 54321), Supabase Studio (port 54323), and an inbucket email server (port 54324). The first run downloads Docker images and takes a minute or two.

When it finishes, it prints your local `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Copy these into `.env.local`.

### 4. Configure environment

```bash
cp .env.example .env.local
# Open .env.local and fill in OPENAI_API_KEY and CRON_SECRET
# The Supabase values come from the output of `supabase start`
```

### 5. Apply migrations

```bash
supabase db push
```

This runs all migration files in `supabase/migrations/` in order, creating all tables, views, indexes, and functions.

### 6. Seed the question bank

Generate an initial set of questions so you have something to play with:

```bash
supabase functions invoke generate-questions \
  --body '{"topUpAll":true}' \
  --env-file .env.local
```

`topUpAll: true` loops through every category/difficulty combination and generates questions until each bucket reaches `QUESTION_BANK_MIN_THRESHOLD`. Expect this to take 60–120 seconds and make ~18 OpenAI calls (6 categories × 3 difficulties).

### 7. Test an endpoint

```bash
# Get your local anon JWT from `supabase start` output, or from Supabase Studio
curl -X GET http://localhost:54321/functions/v1/get-profile \
  -H "Authorization: Bearer <your-local-anon-jwt>"
```

You can also open Supabase Studio at http://localhost:54323 to browse tables and run SQL queries.

### 8. Stop the local stack

```bash
supabase stop
```

---

## Running Tests

Tests use [Vitest](https://vitest.dev/) and run in Node (not Deno), so they test pure logic modules only (XP, validation, deduplication).

```bash
npm install
npm test                # run all tests once
npm run test:watch      # watch mode
npm run test:unit       # unit tests only (XP, validator, deduplicator)
npm run test:integration  # integration tests (requires local Supabase running)
npm run typecheck       # TypeScript type-check without running tests
```

### Test files

| File | What it tests |
|---|---|
| `__tests__/unit/scoring.test.ts` | `computeAnswerXp`, `computeXpEarned`, `levelFromXp`, `xpRequiredForLevel` — all XP math |
| `__tests__/unit/validator.test.ts` | OpenAI response validation — rejects malformed questions, wrong option counts, etc. |
| `__tests__/unit/deduplicator.test.ts` | Content hash generation and deduplication logic |

---

## Deployment

### 1. Create a Supabase project

Go to https://supabase.com, create a new project, and note your **project ref** (the subdomain of your project URL, e.g. `abcdefghijklmnop`).

### 2. Link the CLI to your project

```bash
supabase link --project-ref <your-project-ref>
```

You will be prompted for your database password.

### 3. Set secrets

```bash
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  CRON_SECRET=$(openssl rand -hex 32) \
  OPENAI_MODEL=gpt-4o-mini \
  QUESTION_BANK_MIN_THRESHOLD=30 \
  QUESTION_BANK_TOPUP_COUNT=15 \
  APP_ENV=production
```

Verify with:
```bash
supabase secrets list
```

### 4. Push migrations

```bash
supabase db push
```

### 5. Deploy Edge Functions

```bash
supabase functions deploy
```

This deploys all functions under `supabase/functions/`. To deploy a single function:
```bash
supabase functions deploy generate-questions
```

### 6. Seed the production question bank

```bash
supabase functions invoke generate-questions \
  --project-ref <your-project-ref> \
  --body '{"topUpAll":true}'
```

### 7. Set up a question bank cron job (optional but recommended)

Use an external cron service (e.g., [cron-job.org](https://cron-job.org), GitHub Actions, or Supabase's own pg_cron) to call `generate-questions` on a schedule. A daily top-up is sufficient for most traffic levels.

Example cron-job.org request:
- URL: `https://<project-ref>.supabase.co/functions/v1/generate-questions`
- Method: POST
- Header: `Authorization: Bearer <CRON_SECRET>`
- Body: `{}`

---

## XP & Level System

All gameplay XP logic lives in `supabase/functions/_shared/scoring.ts`. This is the single source of truth — the mobile app mirrors the same formulas in `src/utils/scoring.ts` for UI preview only.

### Per-answer XP

| Component | Value | Condition |
|---|---|---|
| Base XP | 10 on Easy, higher on harder modes | Any correct answer |
| Speed bonus | Up to 50% of base XP | Linear decay: full bonus if answered instantly, 0 at the 15-second mark |
| Difficulty bonus | Medium and Hard add more base XP | Based on selected difficulty |
| Streak bonus | Multiplies answer XP | Active at streak milestones |
| Wrong answer / timeout | 0 | No XP awarded; lose 1 life |

Wrong answers and timeouts reset the streak and cost a life. They do not subtract XP.

### Round XP

Round XP is answer XP plus completion bonuses:

| Bonus | Value |
|---|---|
| Round complete | +50 XP |
| Perfect round | +100 XP |
| No lives lost | +50 XP |
| Daily challenge complete | +75 XP |
| First round today | +100 XP |

### XP examples

| Result | Difficulty | XP earned |
|---|---|---|
| 10/10, fast, no lives lost | Easy | Answer XP + **200+ XP** in round bonuses |
| 10/10, fast, no lives lost | Hard | Higher answer XP plus the same completion bonuses |
| 7/10 | Medium | Answer XP plus the round-complete bonus if all questions were answered |
| 3/10 | Easy | Answer XP only if the player ran out of lives early |

### Level thresholds

Levels use a quadratic curve — each level requires progressively more XP than the last. The formula for total XP required to reach level N:

```
xpRequiredForLevel(N) = sum(100 × i²) for i = 1 to N-1
```

| Level | Total XP required |
|---|---|
| 1 | 0 |
| 2 | 100 |
| 3 | 500 |
| 4 | 1,400 |
| 5 | 3,000 |
| 10 | 28,500 |
| 20 | 254,700 |

Level is recomputed on the server after every round XP submission. The current level and XP are stored on the `users` table.

### Lives

Each round starts with **3 lives**. A wrong answer or timeout costs 1 life. The round ends early if lives reach 0 before all 10 questions are answered.

---

## Customization Guide

### Timer duration

Change `TIMER_SECONDS` in `supabase/functions/_shared/types.ts` (backend) and `TIMER_SECONDS` in `src/constants/game.ts` (mobile app). Both values must match.

### Lives per round

Change `STARTING_LIVES` in `supabase/functions/_shared/types.ts`. Also update `STARTING_LIVES` in the mobile app's `src/constants/game.ts`. The DB constraint `valid_lives CHECK (lives_remaining BETWEEN 0 AND 3)` must also be updated if you increase the starting value.

### Questions per round

Change `QUESTIONS_PER_ROUND` in `supabase/functions/_shared/types.ts`. Also update the mobile app constant and the DB constraint `valid_position CHECK (position BETWEEN 0 AND 9)` to `BETWEEN 0 AND (QUESTIONS_PER_ROUND - 1)`.

### XP values

Edit the constants at the top of `supabase/functions/_shared/scoring.ts` (or via `GAME_CONSTANTS` in `types.ts`):
- `XP_BASE_BY_DIFFICULTY` — base answer XP per difficulty
- `TIMER_SECONDS` — answer timer used for speed XP
- `streakXpMultiplier()` thresholds — streak XP tuning

Mirror the same changes in `src/utils/scoring.ts` in the mobile app.

### AI prompt templates

Edit `src/openai/prompts.ts`:
- `SYSTEM_PROMPT` — sets the overall persona and output format requirements sent to OpenAI
- `buildUserPrompt(category, difficulty, count)` — generates the per-request user message

### OpenAI model

Set the `OPENAI_MODEL` environment variable (or `supabase secrets set OPENAI_MODEL=gpt-4o`). The default is `gpt-4o-mini`. Using `gpt-4o` produces higher quality questions at roughly 15× the cost.

### Add a new category

1. Add the new category string to the `Category` union type in `supabase/functions/_shared/types.ts`
2. Add it to the `CATEGORIES` array in the same file
3. Update the `valid_category` CHECK constraint in `supabase/migrations/20240001000000_init_schema.sql` and write a new migration that alters the constraint on the live database
4. Add display metadata (label, emoji, description) to `src/constants/categories.ts` in the mobile app
5. Reseed questions for the new category: `supabase functions invoke generate-questions --body '{"category":"your_new_category","topUpAll":false}'`

### Difficulty multipliers

Edit `computeXpEarned()` in `supabase/functions/_shared/scoring.ts`. Change the `multipliers` object:
```typescript
const multipliers = { easy: 1.0, medium: 1.5, hard: 2.0 }
```

---

## Post-MVP TODOs

- [ ] Email/social auth (Supabase supports Google, Apple, GitHub OAuth out of the box)
- [ ] Rate limiting on Edge Functions — Supabase has no built-in rate limiter; use Upstash Redis or Cloudflare Workers in front
- [ ] Admin question review dashboard — let a human approve/reject AI-generated questions before they go live
- [ ] Push notifications (Firebase Cloud Messaging + Expo Notifications)
- [ ] Leaderboard filtering by category and difficulty
- [ ] Question reporting / flagging — let players report bad questions
- [ ] Round expiry cleanup cron job — mark rounds with `expires_at` in the past as `abandoned`
- [ ] Per-category and per-difficulty personal bests on the profile
- [ ] Multiplayer / head-to-head mode via Supabase Realtime
