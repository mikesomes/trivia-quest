ALTER TABLE public.question_candidates
  ADD COLUMN editorial_reviewer_model TEXT,
  ADD COLUMN editorial_reviewed_at TIMESTAMPTZ;

CREATE INDEX idx_question_candidates_pending_editorial_review
  ON public.question_candidates (created_at)
  WHERE editorial_status IN ('pending', 'revise') AND editorial_reviewed_at IS NULL;
