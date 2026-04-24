-- Replace get_random_questions with a per-user version.
-- Unseen questions (for this user) sort first; once exhausted falls back to
-- least-globally-used ones. p_user_id is optional — NULL gives old behaviour.
CREATE OR REPLACE FUNCTION public.get_random_questions(
  p_category   TEXT,
  p_difficulty TEXT,
  p_count      INTEGER,
  p_user_id    UUID DEFAULT NULL
)
RETURNS SETOF public.question_bank
LANGUAGE sql
STABLE
AS $$
  SELECT qb.*
  FROM public.question_bank qb
  WHERE qb.category   = p_category
    AND qb.difficulty = p_difficulty
    AND qb.is_active  = true
  ORDER BY
    CASE
      WHEN p_user_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.round_questions rq
        JOIN public.rounds r ON r.id = rq.round_id
        WHERE r.user_id = p_user_id
          AND rq.question_id = qb.id
      ) THEN 1
      ELSE 0
    END,
    qb.times_used,
    RANDOM()
  LIMIT p_count;
$$;
