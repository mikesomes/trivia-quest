-- Quest XP system: per-answer XP, level perks, and higher lives cap

-- Allow lives up to 7 to support high-level perks (was 5)
ALTER TABLE public.rounds
  DROP CONSTRAINT IF EXISTS rounds_lives_remaining_check,
  ADD CONSTRAINT rounds_lives_remaining_check
    CHECK (lives_remaining BETWEEN 0 AND 7);

-- Track whether this round is a quest round (used by submit-answer to award per-answer XP)
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS is_quest BOOLEAN NOT NULL DEFAULT false;

-- Running XP total earned during this round (for end-of-round XP summary animation)
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS xp_earned_in_round INTEGER NOT NULL DEFAULT 0;

-- Per-round lives cap based on player level perks (may differ from global MAX_LIVES)
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS max_lives INTEGER NOT NULL DEFAULT 5;
