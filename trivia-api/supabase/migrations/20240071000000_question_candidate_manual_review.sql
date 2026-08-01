-- Keep the latest human reviewer with the candidate. The project has no
-- general-purpose audit log yet, so this is intentionally minimal provenance.
ALTER TABLE public.question_candidates
  ADD COLUMN reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_question_candidates_reviewed_by
  ON public.question_candidates (reviewed_by)
  WHERE reviewed_by IS NOT NULL;
