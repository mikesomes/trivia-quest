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
  (Deno runtime,                  ├── users, question_bank, rounds,
   ~28 functions)                 │   round_questions, answers, scores
      │                           ├── achievements, user_achievements
      │  OpenAI API calls         ├── daily_challenges, daily_challenge_completions
      ▼                           ├── user_challenge_progress
  gpt-4o-mini                     ├── quest_nodes, quest_node_connections,
  (question gen only)             │   user_quest_progress, quest_node_rounds
                                  ├── sudden_death_scores, question_flags
                                  └── leaderboard views (global, by-category,
                                      per-mode × daily/weekly/all-time)
```

**Key design decisions:**

- **All API endpoints are Supabase Edge Functions** running on Deno. No separate Node/Express server to manage.
- **Database: PostgreSQL via Supabase** with Row Level Security (RLS) enabled on every table. Direct client database access is restricted; all mutations go through Edge Functions using the service role key.
- **Auth: Supabase anonymous auth.** Players get a JWT automatically on first launch — no email or password required for the MVP. The JWT is passed as a Bearer token on every request.
- **Question generation: OpenAI gpt-4o-mini** with structured JSON output via the responses API. Questions are generated in batches and stored in `question_bank`. Generation is decoupled from gameplay — a nightly pg_cron job tops up the bank when it falls below `QUESTION_BANK_MIN` (150) questions per category/difficulty combination. Generated batches are screened for near-duplicates before insert (see `supabase/src/openai/similarity.ts`).
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
| `achievements` / `user_achievements` | Achievement catalogue (rarity tiers) and per-user awards, checked server-side in `submit-xp`, `submit-sudden-death`, and `claim-daily-reward` (see `_shared/achievements.ts`). |
| `user_category_stats` | Per-user correct-answer count per category, incremented in `submit-answer` for every mode. Feeds `category_master_*` achievements. |
| `daily_challenges` / `daily_challenge_completions` | Shared 10-question set per Eastern-time calendar day + completion/streak tracking. |
| `user_challenge_progress` | Progress on rotating daily/weekly XP challenges (`_shared/challenges.ts`). |
| `quest_nodes` / `quest_node_connections` / `user_quest_progress` / `quest_node_rounds` | Quest campaign schema — **not currently used by the shipped client.** `complete-quest-node` and `start-quest-node-run` are fully built (cooldowns, multi-round runs, server-computed star thresholds) but the mobile app computes quest stars/XP/unlocks client-side and never calls them; quest progress lives only in a local Zustand store. Quest XP/stars are therefore not server-validated today. |
| `sudden_death_scores` | Survival-mode run depth records (feeds survival/blitz leaderboards). |
| `leaderboard_rank_snapshots` | Most recent rank per (mode, period, user), refreshed daily by `snapshot-leaderboard-ranks`. Feeds rank-delta ("▲3 since yesterday") badges for xp/classic/blitz × alltime/weekly. Survival isn't snapshotted — its ranking is computed in-memory rather than from a ranked view. |
| `question_flags` | Player reports of bad questions. |
| `daily_reward_claims` | One row per user per Eastern day claiming the daily loot chest (tier + rolled reward); `users.chest_streak`/`longest_chest_streak`/`last_chest_claim_date` track the claim streak that sets the tier. |

`users` also carries denormalized personal bests used for achievement checks: `best_survival_depth`, `best_blitz_correct`.

### Views

| View | Description |
|---|---|
| `leaderboard_global` | All-time ranking by `users.xp`. |
| `leaderboard_by_category` | Per-category XP ranking from `scores` (daily-challenge rounds excluded). |
| `classic_leaderboard_weekly` / `classic_leaderboard_alltime` | Classic-mode rankings from `scores`. |
| `blitz_leaderboard_weekly` / `blitz_leaderboard_alltime` | Blitz rankings from `sudden_death_scores`. |
| `xp_leaderboard_daily` / `xp_leaderboard_weekly` | Period XP rankings. |
| `leaderboard_today` / `leaderboard_weekly` / `leaderboard_all_time` | Legacy views, superseded by the above. |

### Relationships

```
users ──< rounds ──< round_questions >── question_bank
              └──< answers >── question_bank
              └──< scores
```

### Migrations

Migrations live in `supabase/migrations/` and are applied in order — 55 files and counting. Landmarks:

| File | Description |
|---|---|
| `20240001000000_init_schema.sql` | Core tables, constraints, and original leaderboard views |
| `20240002000000_rls_policies.sql` | RLS policies: users can only read/write their own data |
| `20240008/09` | Achievements tables + seed |
| `20240010` | Daily challenge tables |
| `20240021/22/26` | Quest map schema + node seeds (sequential zones) |
| `20240041` | Coin economy (coins + power-up inventory on `users`) |
| `20240045/47/50` | Leaderboard revamp: global/category + per-mode × period views |
| `20240055` | Exclude daily-challenge rounds from category leaderboards |
| `20240056` | Universal day streak (`current_streak`/`longest_streak`/`streak_freezes` on `users`) |
| `20240057` | Daily loot chest (`daily_reward_claims` + chest streak columns) |
| `20240058` | "One more round" momentum bonus (`momentum_bonus_active` on `rounds`) |
| `20240059/60` | Achievement expansion schema (`user_category_stats`, personal-best columns) + 23 new achievements |
| `20240061` | `leaderboard_rank_snapshots` (rank-delta arrows) |

---

## API Endpoints

All endpoints are deployed as Supabase Edge Functions under:
`https://<project-ref>.supabase.co/functions/v1/<endpoint-name>`

Every endpoint requires a valid Supabase JWT in the `Authorization: Bearer <token>` header unless otherwise noted.

**Core gameplay**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/create-round` | Creates a round (classic/blitz/survival/quest; supports difficulty mixes/segments and level-perk starting lives/hammers/shields; rate-limited 60/hr). When `continuationRoundId` points to a just-completed round, also resolves classic life carry-over, survival streak carry-over, and "one more round" momentum-bonus eligibility (see `_shared/momentum.ts`). |
| GET | `/get-round-questions?roundId=<id>` | Returns the round's questions with correct answers stripped. |
| POST | `/submit-answer` | Validates the answer server-side, computes XP, updates round state, increments challenge progress, returns correctness + breakdown. |
| POST | `/finish-round` | Marks the round `completed`; returns a full round summary. |
| POST | `/submit-xp` | Persists round XP to `scores`, awards XP/coins, recomputes level, checks achievements, applies the momentum bonus if eligible, returns new rank. |

**Leaderboards / profile / economy**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/get-leaderboard` | `mode` = global\|category\|classic\|survival\|blitz\|daily\|xp; `period` = today\|weekly\|alltime; paginated. Entries include `previousRank` where a snapshot exists (see below). |
| GET | `/get-profile`, POST | `/update-profile` | Player stats and display-name editing. |
| GET | `/get-category-counts` | Question availability per category. |
| POST | `/purchase-item`, `/equip-items`, `/use-hammer` | Coin shop, loadout equipping, in-round hammer use. |

**Gamification**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/get-daily-challenge`, POST `/complete-daily-challenge` | Shared daily 10-question set with Eastern-midnight reset and day streaks. |
| GET | `/get-challenges` | Daily/weekly XP challenge progress. |
| GET | `/get-daily-reward`, POST `/claim-daily-reward` | Free daily loot chest — GET previews today's tier/streak without claiming; POST rolls and grants the reward (idempotent per Eastern day; see `_shared/chest.ts`). |
| GET | `/get-achievements` | Full achievement catalogue with earned status and, for counter-backed achievements, progress toward the next tier (see `_shared/achievements.ts`). |
| GET | `/get-quest-map`, POST `/start-quest-node-run`, `/complete-quest-node` | Quest campaign progression. |
| POST | `/submit-sudden-death` | Survival-mode run records. |
| POST/DELETE | `/flag-question` | Player question reporting. |

**Ops**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/generate-questions` | `CRON_SECRET` or service key | OpenAI question generation with validation/dedup/verification. Accepts `{ category?, difficulty?, count?, topUpAll? }`. |
| POST | `/snapshot-leaderboard-ranks` | `CRON_SECRET` or service key | Snapshots current ranks (xp/classic/blitz × alltime/weekly) so `get-leaderboard` can compute rank-delta badges. Run daily. |
| GET | `/health` | none | Liveness check. |

All player endpoints require `Authorization: Bearer <JWT>`.

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
| `QUESTION_BANK_MIN_THRESHOLD` | Minimum questions per category/difficulty before a top-up is triggered. Overrides `GAME_CONSTANTS.QUESTION_BANK_MIN`. Default: `150`. |
| `QUESTION_BANK_TOPUP_COUNT` | How many questions to generate per batch when topping up. Default: `15`. |
| `CRON_SECRET` | A random secret string you generate. Used to authenticate calls to `generate-questions` from a cron job. Generate with: `openssl rand -hex 32` |
| `APP_ENV` | `development` or `production`. Controls logging verbosity. |
| `EXPO_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` — included here so `.env.example` can serve both repos. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY`. |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL for Edge Function calls, e.g. `https://abcdef.supabase.co/functions/v1` |
| `EXPO_PUBLIC_ENV` | `development` or `production`. |

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

`topUpAll: true` loops through every category/difficulty combination and generates questions for each bucket below `QUESTION_BANK_MIN_THRESHOLD` (12 categories × 3 difficulties = up to 36 OpenAI calls; expect a few minutes). Use `npm run audit:duplicates` to see the current state of the bank before and after. Import scripts in `scripts/` (Open Trivia DB, NFL, etc.) offer a no-cost alternative for some categories.

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
| `__tests__/unit/hammer.test.ts` | Hammer power-up: eliminating two wrong options |
| `__tests__/unit/streaks.test.ts` | Day-streak advancement, freeze bridging, and reset logic (`_shared/streakLogic.ts`) |
| `__tests__/unit/chest.test.ts` | Daily chest tier thresholds and weighted reward rolls, incl. inventory-cap fallback (`_shared/chest.ts`) |
| `__tests__/unit/momentum.test.ts` | "One more round" momentum bonus window eligibility, incl. clock-skew guard (`_shared/momentum.ts`) |
| `__tests__/unit/achievements.test.ts` | Threshold-tier condition building shared by award-checking and progress display (`_shared/achievementLogic.ts`) |

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
  QUESTION_BANK_MIN_THRESHOLD=150 \
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

### 7. Enable the scheduled maintenance jobs

Two jobs keep the game healthy, and both are scheduled by migration
`20240065000000_schedule_maintenance_jobs.sql` using pg_cron — you do not need
an external cron service.

| Job | Schedule | What it does |
|---|---|---|
| `question-bank-topup` | 09:00 UTC daily | Calls `generate-questions` with `{"topUpAll": true}`, filling any category/difficulty below `QUESTION_BANK_MIN`. |
| `leaderboard-rank-snapshot` | 04:30 UTC daily | Calls `snapshot-leaderboard-ranks` so `get-leaderboard` has a "rank as of yesterday" to diff against. Without it, movement badges stay hidden — the client degrades gracefully. |

The migration reads the function URL and the shared secret from Vault rather
than hardcoding them. Create both once per project, then re-run the scheduler:

```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'functions_base_url');
select vault.create_secret('<your CRON_SECRET>', 'cron_secret');
select public.schedule_maintenance_jobs();
```

If the secrets are missing the migration still applies cleanly and tells you
what to create, so a fresh environment never fails its deploy over this.

Confirm the jobs are registered and running:

```sql
select jobname, schedule, active from cron.job;
select jobname, status, start_time from cron.job_run_details order by start_time desc limit 10;
```

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

- [ ] Wire the mobile client to `complete-quest-node`/`start-quest-node-run` for real — quest progress is currently client-side only (see the note on quest tables above); this would also unlock quest-native achievements (nodes completed, stars earned)
- [ ] Email/social auth (Supabase supports Google, Apple, GitHub OAuth out of the box)
- [ ] Admin question review dashboard — approve/reject flagged and AI-generated questions
- [ ] Server push notifications (Expo Push + `push_tokens` table + pg_cron senders)
- [ ] Streak repair offer (grace window to restore a broken day streak for coins) — freezes exist, repair does not
- [ ] Weekly leagues (cohorts, promotion/demotion)
- [ ] Friends + async head-to-head duels
- [ ] Round expiry cleanup cron job — mark rounds with `expires_at` in the past as `abandoned`
- [ ] Integration tests for edge functions (only pure-logic unit tests exist today)
