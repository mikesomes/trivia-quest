-- Separate AI blind-review provenance from editorial review provenance.
ALTER TABLE public.question_candidates
  ADD COLUMN blind_reviewer_model TEXT,
  ADD COLUMN blind_reviewer_notes TEXT,
  ADD COLUMN blind_reviewed_at TIMESTAMPTZ;

CREATE INDEX idx_question_candidates_pending_blind_review
  ON public.question_candidates (created_at)
  WHERE editorial_status IN ('pending', 'revise') AND blind_reviewed_at IS NULL;
