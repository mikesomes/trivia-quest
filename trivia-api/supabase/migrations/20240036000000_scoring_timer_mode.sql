-- Persist which visible countdown governs answer XP for this round.
-- Classic and survival use per-question timing; Blitz uses the round timer.
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS scoring_timer_mode TEXT NOT NULL DEFAULT 'question';

ALTER TABLE public.rounds
  DROP CONSTRAINT IF EXISTS rounds_scoring_timer_mode_check,
  ADD CONSTRAINT rounds_scoring_timer_mode_check
    CHECK (scoring_timer_mode IN ('question', 'round'));
