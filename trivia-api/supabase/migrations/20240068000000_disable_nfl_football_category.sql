-- Take NFL Football out of rotation and mark it "coming soon".
--
-- The duplicate audit found it to be by far the worst category in the bank:
-- 560 questions carrying 1,413 near-duplicate pairs — more flagged pairs than
-- questions — including five variants of "longest playoff drought" answering
-- Cleveland Browns, filed across easy, medium and hard. It is also the category
-- most exposed to going stale, since the prompt caps knowledge at the 2023
-- season.
--
-- The rows are deactivated rather than deleted. "Coming soon" means it is
-- expected back, and these are the rows a cleanup pass would work on.
--
-- Deactivation is load-bearing, not cosmetic. Removing nfl_football from the
-- CATEGORIES list stops it being *chosen* — isValidCategory rejects it, so
-- create-round 400s and topUpAll skips it — but createDailyChallenge samples
-- from every active question with no category filter, so NFL questions would
-- have kept appearing in the daily challenge of a category nobody can play.
--
-- The valid_category CHECK constraint deliberately still allows the value: the
-- rows are still here, historical scores and rounds still reference it, and
-- re-enabling should not need a schema change.
--
-- To bring it back: clean up the duplicates, re-activate the rows below, add
-- 'nfl_football' back to CATEGORIES in _shared/types.ts, and drop the
-- comingSoon flag in mobile-app/src/constants/categories.ts.

UPDATE public.question_bank
SET is_active = false
WHERE category = 'nfl_football';
