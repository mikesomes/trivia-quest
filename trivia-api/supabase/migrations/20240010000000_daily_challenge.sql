-- Daily challenge: one set of 10 questions per calendar day, same for all users.

-- Stores the pre-selected question IDs for each day.
CREATE TABLE daily_challenges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE UNIQUE NOT NULL,
  question_ids   UUID[] NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Tracks each user's completion of a day's challenge.
CREATE TABLE daily_challenge_completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  round_id       UUID REFERENCES rounds(id),
  score          INTEGER NOT NULL DEFAULT 0,
  correct_count  INTEGER NOT NULL DEFAULT 0,
  xp_earned      INTEGER NOT NULL DEFAULT 0,
  completed_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);

CREATE INDEX idx_daily_completions_user_date
  ON daily_challenge_completions(user_id, challenge_date DESC);

-- Flag rounds that belong to a daily challenge so we can look them up.
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS is_daily_challenge BOOLEAN NOT NULL DEFAULT false;

-- RLS: anyone authenticated can read challenge definitions (they're public).
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_challenges_select" ON daily_challenges
  FOR SELECT USING (true);

-- RLS: users can only read/write their own completions.
ALTER TABLE daily_challenge_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_completions_own" ON daily_challenge_completions
  FOR ALL USING (auth.uid() = user_id);
