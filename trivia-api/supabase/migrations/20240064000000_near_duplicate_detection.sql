-- Near-duplicate rejection for the question bank.
--
-- content_hash already makes verbatim duplicates impossible, but it hashes the
-- exact question text, so a reworded question is a different hash and lands in
-- the bank alongside the original. Rewording is precisely what a single model
-- produces when it is asked for the same category over and over, and it is what
-- players experience as a repeat.
--
-- The rule is two signals, not one. Text similarity alone does not work here:
--   "Which element has the symbol Au?" vs "...Ag?"        -> 0.88, NOT duplicates
--   "What is the capital of France?" vs "...of Germany?"  -> 0.61, NOT duplicates
--   "Who wrote Hamlet?" vs "Which playwright wrote Hamlet?" -> 0.45, duplicates
-- There is no threshold that separates those. Trivia questions within a
-- category are phrased alike by nature. What distinguishes a duplicate from a
-- sibling is that it resolves to the same answer, so a shared correct answer is
-- the gate and similarity is the confirmation.
--
-- Auditing the live bank at the time of writing found 6,813 same-answer pairs
-- over 0.35 across 11,525 questions, against 150,612 pairs at the same
-- similarity when the answer is ignored — a 22x difference, and the reason a
-- text-only threshold would have rejected most of a legitimate batch.
-- The default threshold is calibrated in supabase/src/openai/similarity.ts.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Normalized correct answer, stored so it can be indexed. Mirrors answerKey()
-- in supabase/src/openai/similarity.ts.
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS answer_key TEXT
  GENERATED ALWAYS AS (
    btrim(regexp_replace(
      lower(
        CASE correct_option
          WHEN 'a' THEN option_a
          WHEN 'b' THEN option_b
          WHEN 'c' THEN option_c
          WHEN 'd' THEN option_d
        END
      ),
      '[^a-z0-9]+', ' ', 'g'
    ))
  ) STORED;

-- The gate is an equality match, so this index is what makes the check cheap:
-- it narrows a category to the handful of questions sharing an answer before
-- similarity() is computed on anything.
CREATE INDEX IF NOT EXISTS idx_question_bank_answer_key
  ON public.question_bank (category, answer_key)
  WHERE is_active = true;

-- Score a batch of candidate questions against the bank in one round trip.
-- Returns only candidates that clear the threshold, with the row they collide
-- with, so the caller can log what was rejected and why.
--
-- p_candidates: [{"idx": 0, "text": "...", "answer": "..."}, ...]
CREATE OR REPLACE FUNCTION public.check_question_duplicates(
  p_category   TEXT,
  p_candidates JSONB,
  p_threshold  REAL DEFAULT 0.55
)
RETURNS TABLE (
  idx        INTEGER,
  match_id   UUID,
  match_text TEXT,
  score      REAL
)
LANGUAGE sql
STABLE
AS $$
  WITH candidates AS (
    SELECT
      (c->>'idx')::INTEGER AS idx,
      c->>'text'           AS text,
      btrim(regexp_replace(lower(c->>'answer'), '[^a-z0-9]+', ' ', 'g')) AS answer_key
    FROM jsonb_array_elements(p_candidates) AS c
  ),
  scored AS (
    SELECT
      c.idx,
      qb.id                                  AS match_id,
      qb.question_text                       AS match_text,
      similarity(qb.question_text, c.text)   AS score,
      ROW_NUMBER() OVER (
        PARTITION BY c.idx
        ORDER BY similarity(qb.question_text, c.text) DESC
      ) AS rn
    FROM candidates c
    JOIN public.question_bank qb
      ON qb.category   = p_category
     AND qb.is_active  = true
     AND qb.answer_key = c.answer_key
    WHERE c.answer_key <> ''
  )
  SELECT s.idx, s.match_id, s.match_text, s.score
  FROM scored s
  WHERE s.rn = 1
    AND s.score >= p_threshold;
$$;

ALTER FUNCTION public.check_question_duplicates(TEXT, JSONB, REAL) SET search_path = public;

REVOKE ALL ON FUNCTION public.check_question_duplicates(TEXT, JSONB, REAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_question_duplicates(TEXT, JSONB, REAL) FROM anon;
REVOKE ALL ON FUNCTION public.check_question_duplicates(TEXT, JSONB, REAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_question_duplicates(TEXT, JSONB, REAL) TO service_role;
