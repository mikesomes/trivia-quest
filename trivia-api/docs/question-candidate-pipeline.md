# Question candidate pipeline

`question_bank` remains the live, player-facing question table. `question_candidates` is a private staging table for generated or manually prepared questions. A candidate is never playable until the database promotion function copies it into `question_bank` and records its `source_candidate_id`.

## Statuses

- Editorial: `pending` (awaiting review), `approved` (eligible for promotion), `revise` (needs changes), or `rejected`.
- Verification: `unverified`, `verified`, or `failed`.

Promotion requires `approved` and `verified` by default. If a blind review exists, it must match the stored answer. `promote_question_candidate` locks the candidate, creates the live row in the same database transaction, records provenance, and prevents a second promotion.

## Development

Apply migrations locally with `supabase db reset`, or apply this migration to a linked environment with `supabase db push`. Run validation and promotion tests from `trivia-api` with `npm test -- questionCandidates.test.ts` (or all tests with `npm test`). The valid fixture in that test is the development-only schema-validation record; no sample candidate is seeded into a deployed environment.

## Future generator contract

A future generator must validate its payload with `validateQuestionCandidate` and insert only into `question_candidates`, with `editorial_status = 'pending'` and `verification_status = 'unverified'`. It must not write to `question_bank`. A future review workflow updates the candidate metadata, then invokes the transaction-backed `promoteQuestionCandidate` service (which calls `promote_question_candidate`) only after all gates pass.

The current difficulty labels remain `easy`, `medium`, and `hard`; `difficulty_rating` adds 1–10 granularity without changing gameplay selection. Candidate category validation accepts the current playable category allow-list. The database retains the full existing `question_bank` category set so historical/out-of-rotation categories are not invalidated.

The legacy `question-bank-topup` cron job is unscheduled by the migration. It measured only live-bank inventory, so retaining it would create an unbounded candidate backlog. A future capacity-aware batch processor should replace it.

## Manual review gate

There is intentionally no dashboard yet. Two protected Edge Functions provide the smallest review surface:

- `GET`/`PATCH` `review-question-candidates` lists `pending` and `revise` candidates, and accepts only review fields.
- `POST` `promote-question-candidate` calls the database promotion RPC; it never inserts a live row itself.

Both require a valid Supabase user token and require that user ID to be listed in the server-side `ADMIN_USER_IDS` environment variable (a comma-separated UUID allow-list). Set it only as an Edge Function secret, for example:

```bash
supabase secrets set ADMIN_USER_IDS="<your-supabase-user-uuid>"
```

`blind_review_matches` is calculated server-side from `blind_review_answer_index`; clients cannot submit it. Every review update records `reviewed_at` and the reviewer’s user ID in `reviewed_by`.

### Development end-to-end exercise

1. Apply migrations: `supabase db push`.
2. In a local development environment only, set `ALLOW_DEVELOPMENT_CANDIDATE_SEED=true` and run `npm run seed:question-candidates`. This inserts or resets five deterministic fixture rows in batch `manual-review-test-001` (`00000000-0000-4000-8000-000000000001`).
3. Deploy or serve the two review functions and configure `ADMIN_USER_IDS` with the reviewing user’s UUID.
4. Call `GET /functions/v1/review-question-candidates` with that user’s Bearer token. Review the four choices independently, then PATCH a row with `{ "candidateId": "…", "review": { "blind_review_answer_index": 1, "editorial_status": "approved", "reviewer_confidence": 0.95, "verification_status": "verified", "verification_source": "reviewed against a reliable reference" } }`. Use the answer index you independently selected.
5. Reject the subjective “best color” fixture, and mark the `2 + 2` fixture `revise` because its distractors are weak.
6. Promote one approved/verified candidate with `POST /functions/v1/promote-question-candidate` and `{ "candidateId": "…" }`.
7. Confirm it appears once in `question_bank` using its `source_candidate_id`; a second promotion, a rejected candidate, or an unverified candidate returns an error.

Run the focused tests with `npm test -- questionCandidateReview.test.ts`, or run all checks with `npm run typecheck && npm test`.

## AI blind review

`run-ai-blind-review` is a service-authorized Edge Function. It selects up to ten pending or revision candidates that have not already received an AI blind review. The model receives the category, question text, and four choices only; it does not receive the stored answer, answer index, or explanation. The server compares its selected index to the stored index and saves the result, confidence, notes, model name, and timestamp. Each AI stage accepts an optional `generationBatchId`, which scopes it to exactly one generated batch.

It does **not** change editorial status, verification status, or create a live question. A blind-review mismatch is a useful signal for a later editorial workflow, not an automatic rejection.

## AI fact verification

`run-ai-fact-verification` is a separate, service-authorized operation. It uses the Responses API with web search, checks the stated answer and explanation, and records `verified`, `failed`, or `unverified` plus the returned source URL, notes, model, and timestamp. Missing or unvalidated sources fail safe to `unverified`. It does not approve or promote candidates.

## Batch promotion

`promote-approved-candidates` is the final service-authorized step. It selects only candidates already marked `approved`, `verified`, and blind-review matched, then delegates each one to `promote_question_candidate`. The database RPC remains the single promotion authority and rechecks blind-review matching, duplicate prevention, and one-time provenance inside its transaction. The batch function has no direct `question_bank` insert.

## Automated pipeline

`run-question-candidate-pipeline` is the only function the scheduler calls. It generates a maximum of five candidates per run, then scopes blind review, fact verification, editorial review, and promotion to the resulting generation batch. It records a `running`, `succeeded`, `partial`, or `failed` row in `question_candidate_pipeline_runs`; overlapping runs are skipped and a run abandoned for 45 minutes is released safely.

Set a deliberately small coverage target on the Edge runtime, for example:

```bash
supabase secrets set AI_PIPELINE_TARGETS='[{"category":"science","difficulty":"medium","count":5}]'
```

The scheduler invokes the function at 09:00 UTC daily using the existing Vault `cron_secret`. After deploying the function and applying the scheduler migration, run `select public.schedule_maintenance_jobs();` once in the Supabase SQL editor. You may test a configured run manually with `POST /functions/v1/run-question-candidate-pipeline`, `Authorization: Bearer $CRON_SECRET`, and `{}`. Do not pass a broad all-category top-up: increasing coverage is an explicit target configuration change.
