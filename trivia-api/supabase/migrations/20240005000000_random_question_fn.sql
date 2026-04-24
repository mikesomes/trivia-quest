-- Function: get_random_questions
-- Selects N random questions for a round, preferring least-used ones.
-- Uses ORDER BY times_used, RANDOM() so questions with lower use counts
-- are drawn first, but selection within each tier is fully random.
-- With a large bank this effectively means true randomness until questions
-- have been seen multiple times.
CREATE OR REPLACE FUNCTION public.get_random_questions(
  p_category  TEXT,
  p_difficulty TEXT,
  p_count     INTEGER
)
RETURNS SETOF public.question_bank
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.question_bank
  WHERE category   = p_category
    AND difficulty = p_difficulty
    AND is_active  = true
  ORDER BY times_used, RANDOM()
  LIMIT p_count;
$$;
