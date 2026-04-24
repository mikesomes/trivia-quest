-- Track consecutive failures and cooldown expiry per user per node
ALTER TABLE public.user_quest_progress
  ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;
