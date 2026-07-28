-- Daily loot chest: one free claim per Eastern calendar day. Consecutive days
-- claimed (independent of the day-streak/daily-challenge streaks) advances the
-- chest's tier (wood -> silver -> gold), which widens the coin reward range.
CREATE TABLE public.daily_reward_claims (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claim_date     DATE NOT NULL,
  tier           TEXT NOT NULL CHECK (tier IN ('wood', 'silver', 'gold')),
  reward_type    TEXT NOT NULL CHECK (reward_type IN ('coins', 'life', 'hammer', 'shield', 'xp_booster', 'jackpot')),
  reward_amount  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_date)
);

CREATE INDEX idx_daily_reward_claims_user_date
  ON public.daily_reward_claims(user_id, claim_date DESC);

ALTER TABLE public.users
  ADD COLUMN chest_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN longest_chest_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN last_chest_claim_date DATE;

ALTER TABLE public.daily_reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_reward_claims_own" ON public.daily_reward_claims
  FOR ALL USING (auth.uid() = user_id);
