-- Fix: only count questions actually presented to the user (presented_at IS NOT NULL).
-- The previous LATERAL counted all round_questions entries, including questions in
-- abandoned rounds the user never saw, causing premature seen-count inflation and
-- breaking the cycling guarantee introduced in 20240048.
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
  WITH user_presented AS (
    SELECT rq.question_id, COUNT(*)::int AS times_presented
    FROM public.round_questions rq
    JOIN public.rounds r ON r.id = rq.round_id
    WHERE p_user_id IS NOT NULL
      AND r.user_id = p_user_id
      AND rq.presented_at IS NOT NULL
    GROUP BY rq.question_id
  )
  SELECT qb.*
  FROM public.question_bank qb
  LEFT JOIN user_presented up ON up.question_id = qb.id
  WHERE qb.category   = p_category
    AND qb.difficulty = p_difficulty
    AND qb.is_active  = true
  ORDER BY
    COALESCE(up.times_presented, 0) ASC,
    qb.times_used ASC,
    RANDOM()
  LIMIT p_count;
$$;

-- Partial index to speed up the presented_at IS NOT NULL filter
CREATE INDEX IF NOT EXISTS idx_round_questions_presented_not_null
  ON public.round_questions (question_id)
  WHERE presented_at IS NOT NULL;
