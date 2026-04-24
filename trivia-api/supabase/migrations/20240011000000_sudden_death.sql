-- Sudden death: endless mode where one wrong answer ends the run.
-- Separate score table so these don't pollute the regular leaderboard.

CREATE TABLE sudden_death_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questions_answered  INTEGER NOT NULL DEFAULT 0,
  total_score         INTEGER NOT NULL DEFAULT 0,
  completed_at        TIMESTAMPTZ DEFAULT now()
);

-- Index for leaderboard queries (rank by questions_answered desc, then score desc)
CREATE INDEX idx_sd_scores_leaderboard
  ON sudden_death_scores(questions_answered DESC, total_score DESC);

CREATE INDEX idx_sd_scores_user
  ON sudden_death_scores(user_id, completed_at DESC);

ALTER TABLE sudden_death_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sd_scores_select" ON sudden_death_scores FOR SELECT USING (true);
CREATE POLICY "sd_scores_insert" ON sudden_death_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
