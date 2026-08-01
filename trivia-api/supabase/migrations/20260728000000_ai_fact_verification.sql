ALTER TABLE public.question_candidates
  ADD COLUMN verification_model TEXT,
  ADD COLUMN verification_notes TEXT,
  ADD COLUMN verified_at TIMESTAMPTZ;

CREATE INDEX idx_question_candidates_pending_verification
  ON public.question_candidates (created_at)
  WHERE editorial_status IN ('pending', 'revise') AND verification_status = 'unverified' AND verified_at IS NULL;
