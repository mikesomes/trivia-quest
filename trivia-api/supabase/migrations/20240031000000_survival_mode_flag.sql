-- Mark rounds that belong to a survival (sudden-death) run.
-- Used by submit-answer to disable the extra-life-on-streak mechanic.
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS is_survival BOOLEAN NOT NULL DEFAULT FALSE;
