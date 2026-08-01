-- Retire Odd One Out. Unlike the nfl_football / roman_history / harry_potter
-- deactivations (20240068, 20240069), this isn't a quality-driven pause with
-- cleanup expected — it's a permanent product decision. Odd One Out was never
-- a distinct game mechanic: server-side it's just a category with a custom
-- generation prompt, and client-side it reused the standard question-
-- answering screen with no mode-specific rendering. Modeling it as both a
-- "mode" in mode-select and a category in the picker was confusing for no
-- real gameplay benefit, so it's being cut outright rather than fixed.
--
-- Rows are deactivated rather than deleted for the same reason as those two
-- migrations: historical rounds, scores and user_category_stats still
-- reference this category, and question_bank rows are keyed by content_hash
-- for dedup, so rewriting or deleting them risks orphaning that history for
-- no benefit. The valid_category CHECK constraint deliberately still allows
-- the value.
--
-- 'odd_one_out' is already removed from CATEGORIES in _shared/types.ts, so
-- create-round rejects it and topUpAll won't generate more. createDailyChallenge
-- samples from every active question with no category filter, so deactivating
-- the rows (not just delisting the category) is what stops them from still
-- surfacing there.

UPDATE public.question_bank
SET is_active = false
WHERE category = 'odd_one_out';
