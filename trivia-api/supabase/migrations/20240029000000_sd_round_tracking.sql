-- Prevent the same round from being submitted to multiple sudden death sessions.
-- Once a round's score is claimed by a survival run, it cannot be reused.
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS sd_submitted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_rounds_sd_submitted
  ON public.rounds(user_id, sd_submitted)
  WHERE sd_submitted = FALSE;
