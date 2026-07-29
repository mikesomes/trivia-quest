-- Take Harry Potter and Roman History out of rotation, same treatment as
-- nfl_football in 20240068.
--
-- The duplicate audit found them the next worst categories after NFL:
--   roman_history   1,010 flagged pairs over 504 questions
--   harry_potter      740 flagged pairs over 503 questions
-- Both are categories with a fixed, finite body of source material asked about
-- from a handful of angles, which is exactly the shape that produces
-- rewordings under repeated generation from one prompt.
--
-- Same reasoning as 20240068 on why deactivation (not deletion) and why the
-- CATEGORIES list, not just the client flag: createDailyChallenge samples from
-- every active question with no category filter, so leaving these rows active
-- would keep surfacing them in the daily challenge after both categories are
-- marked coming soon.
--
-- No active Knowledge Isles node uses either category — the only quest node
-- referencing roman_history ('roman_1') lives in the 'legacy' region, already
-- deactivated by 20240062.

UPDATE public.question_bank
SET is_active = false
WHERE category IN ('harry_potter', 'roman_history');
