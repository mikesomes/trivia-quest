-- Upgrade get_random_questions to EXCLUDE seen questions first.
-- Strategy: return unseen questions up to p_count; if the unseen pool is
-- smaller than p_count, fill the remainder from seen questions (least-used
-- first) so the round always completes.
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
  (
    -- Unseen questions: never appeared in any of this user's rounds
    SELECT qb.*
    FROM public.question_bank qb
    WHERE qb.category   = p_category
      AND qb.difficulty = p_difficulty
      AND qb.is_active  = true
      AND (
        p_user_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.round_questions rq
          JOIN public.rounds r ON r.id = rq.round_id
          WHERE r.user_id    = p_user_id
            AND rq.question_id = qb.id
        )
      )
    ORDER BY qb.times_used, RANDOM()
    LIMIT p_count
  )
  UNION ALL
  (
    -- Fallback: seen questions, only reached when the unseen pool runs dry
    SELECT qb.*
    FROM public.question_bank qb
    WHERE qb.category   = p_category
      AND qb.difficulty = p_difficulty
      AND qb.is_active  = true
      AND p_user_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.round_questions rq
        JOIN public.rounds r ON r.id = rq.round_id
        WHERE r.user_id    = p_user_id
          AND rq.question_id = qb.id
      )
    ORDER BY qb.times_used, RANDOM()
  )
  LIMIT p_count;
$$;
