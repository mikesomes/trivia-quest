-- Expose the near-duplicate rule as a query over the live bank.
--
-- check_question_duplicates (20240064) answers "does this incoming candidate
-- duplicate something already in the bank?". This answers the retroactive
-- question nobody has asked yet: "which questions already in the bank duplicate
-- each other?". Same rule, same threshold default, same two signals — a shared
-- normalized answer_key is the gate, pg_trgm similarity the confirmation.
--
-- It lives in SQL rather than in the sweep script because pg_trgm is the
-- authority. supabase/src/openai/similarity.ts reimplements it faithfully for
-- the generator, but the two disagree on a handful of pairs at the threshold
-- boundary, and the bank should be judged by the same function that rejects new
-- questions.
--
-- Read-only. The caller resolves overlapping pairs into clusters and decides
-- which member survives; this only reports the edges.
--
-- Returns one JSONB array rather than a set of rows. PostgREST caps a response
-- at max-rows (1,000 here) and ignores Range on an RPC POST, so a set-returning
-- version silently truncates at 1,000 of the ~1,800 pairs with no way to page
-- for the rest. Aggregating server-side returns them all in a single row, and
-- runs the self-join once instead of once per attempted page.

DROP FUNCTION IF EXISTS public.find_bank_near_duplicates(REAL, TEXT);

CREATE OR REPLACE FUNCTION public.find_bank_near_duplicates(
  p_threshold REAL DEFAULT 0.55,
  p_category TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('aId', p.a_id, 'bId', p.b_id, 'category', p.category, 'score', p.score)
    ORDER BY p.category, p.score DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      a.id       AS a_id,
      b.id       AS b_id,
      a.category AS category,
      similarity(a.question_text, b.question_text) AS score
    FROM public.question_bank a
    JOIN public.question_bank b
      ON a.category   = b.category
     AND a.answer_key = b.answer_key
     -- a.id < b.id yields each unordered pair exactly once and never self-pairs.
     AND a.id < b.id
    WHERE a.is_active
      AND b.is_active
      AND a.answer_key <> ''
      AND (p_category IS NULL OR a.category = p_category)
      AND similarity(a.question_text, b.question_text) >= p_threshold
  ) p;
$$;

REVOKE ALL ON FUNCTION public.find_bank_near_duplicates(REAL, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_bank_near_duplicates(REAL, TEXT) TO service_role;
