-- Per-question quality signals.
--
-- question_bank.times_used says how often a question has been served. It says
-- nothing about whether the question is any good. Two failures are invisible
-- today and both degrade the game quietly:
--
--   1. A wrong answer key. The question reads fine, but the option marked
--      correct is not, so nearly everyone "gets it wrong". Players who know the
--      subject are the most likely to notice and the most likely to leave.
--   2. A mislabelled difficulty. The audit found the same NFL fact filed as
--      easy, medium and hard, which means difficulty is being self-assigned by
--      the model rather than measured. Difficulty mixes drive round
--      composition, so this distorts every game mode at once.
--
-- Both are obvious in aggregate answer data and invisible in any single round.

CREATE OR REPLACE VIEW public.question_stats AS
SELECT
  qb.id,
  qb.category,
  qb.difficulty,
  qb.question_text,
  qb.is_active,
  COUNT(a.id)::INTEGER                                            AS times_answered,
  COUNT(a.id) FILTER (WHERE a.is_correct)::INTEGER                AS times_correct,
  CASE WHEN COUNT(a.id) > 0
       THEN ROUND(AVG(CASE WHEN a.is_correct THEN 1.0 ELSE 0.0 END), 4)
       ELSE NULL
  END                                                             AS correct_rate,
  CASE WHEN COUNT(a.id) > 0
       THEN ROUND(AVG(a.time_taken_ms))::INTEGER
       ELSE NULL
  END                                                             AS avg_time_ms,
  COALESCE(f.flag_count, 0)::INTEGER                              AS flag_count
FROM public.question_bank qb
LEFT JOIN public.answers a ON a.question_id = qb.id
LEFT JOIN (
  SELECT question_id, COUNT(*) AS flag_count
  FROM public.question_flags
  GROUP BY question_id
) f ON f.question_id = qb.id
GROUP BY qb.id, qb.category, qb.difficulty, qb.question_text, qb.is_active, f.flag_count;

CREATE INDEX IF NOT EXISTS idx_answers_question_correct
  ON public.answers (question_id, is_correct);

-- Minimum answers before a rate is treated as signal rather than noise.
-- At n=30 a genuinely 50/50 question sits roughly within +/-18 points at 95%
-- confidence, which is wide — hence the deliberately extreme thresholds below.
CREATE OR REPLACE FUNCTION public.question_quality_sample_floor()
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$ SELECT 30 $$;

-- Questions worth a human look, with the reason attached.
--
-- Nothing here deactivates anything on its own. Statistical outliers are
-- evidence, not proof: a legitimately brutal question and a question with a
-- wrong answer key look identical from this angle, and only reading it can
-- tell them apart. Player flags already auto-deactivate at their own threshold
-- in flag-question; that is a different signal, deliberately kept separate.
CREATE OR REPLACE VIEW public.question_quarantine AS
SELECT
  s.*,
  CASE
    WHEN s.correct_rate < 0.15 THEN 'suspect_answer_key'
    WHEN s.difficulty = 'hard' AND s.correct_rate > 0.95 THEN 'too_easy_for_hard'
    WHEN s.difficulty = 'easy' AND s.correct_rate < 0.40 THEN 'too_hard_for_easy'
  END AS reason
FROM public.question_stats s
WHERE s.is_active = true
  AND s.times_answered >= public.question_quality_sample_floor()
  AND (
    s.correct_rate < 0.15
    OR (s.difficulty = 'hard' AND s.correct_rate > 0.95)
    OR (s.difficulty = 'easy' AND s.correct_rate < 0.40)
  );

-- Views inherit the querying role's permissions; only the service role should
-- see cross-player aggregates.
REVOKE ALL ON public.question_stats FROM anon, authenticated;
REVOKE ALL ON public.question_quarantine FROM anon, authenticated;
GRANT SELECT ON public.question_stats TO service_role;
GRANT SELECT ON public.question_quarantine TO service_role;
