-- Replace get_random_questions to guarantee per-user cycle-through.
-- Supersedes 20240024000000_exclude_seen_questions.sql, which used a
-- UNION ALL with an unbounded fallback branch sorted by *global* times_used.
-- That meant once a user exhausted the unseen pool in a bucket, the
-- remaining selection collapsed to RANDOM() and they could see the
-- questions they had just played again in the very next round.
--
-- This version sorts every candidate by *per-user* seen count first, then
-- falls back to global times_used and RANDOM() only as tiebreaks. A
-- question is therefore never repeated for a user until every other
-- question in the bucket has been shown to them the same number of times.
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
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS user_seen_count
    FROM public.round_questions rq
    JOIN public.rounds r ON r.id = rq.round_id
    WHERE p_user_id IS NOT NULL
      AND r.user_id = p_user_id
      AND rq.question_id = qb.id
  ) urs ON true
  WHERE qb.category   = p_category
    AND qb.difficulty = p_difficulty
    AND qb.is_active  = true
  ORDER BY
    COALESCE(urs.user_seen_count, 0) ASC,
    qb.times_used ASC,
    RANDOM()
  LIMIT p_count;
$$;
