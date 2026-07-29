-- Video Games becomes its own category.
--
-- The bank is seeded from Open Trivia DB category 15 ("Entertainment: Video
-- Games") rather than the generator. OTDB lists 1,185 questions there, but 167
-- of those are true/false and question_bank requires four non-null options, so
-- the import filters to type=multiple and lands 1,018 questions
-- (317 easy / 489 medium / 212 hard) — measured, not estimated. Every
-- difficulty clears QUESTION_BANK_MIN (150) on arrival, so the nightly top-up
-- has nothing to generate here and the category costs no OpenAI spend.
-- Run `node scripts/import-opentdb.mjs --category video_games` after this
-- applies.
--
-- Until now video-game questions landed in general_knowledge and movies_tv,
-- where they were a small unlabelled minority. They stay there: rewriting the
-- category of existing rows would break content_hash-based dedup expectations
-- and orphan the answer history in user_category_stats. New imports land here.
ALTER TABLE public.question_bank
  DROP CONSTRAINT valid_category,
  ADD CONSTRAINT valid_category CHECK (category IN (
    'general_knowledge','history','science','sports','movies_tv','geography',
    'nfl_football','roman_history','harry_potter','famous_quotes','music',
    'odd_one_out','video_games'
  ));
