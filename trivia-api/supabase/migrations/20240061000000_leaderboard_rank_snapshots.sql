-- Rank-delta arrows ("▲3 since yesterday") need a "before" rank to compare
-- against. This table holds the most recent snapshot per (mode, period, user);
-- snapshot-leaderboard-ranks overwrites it once daily, so get-leaderboard can
-- diff the live rank against "rank as of the last snapshot".
CREATE TABLE public.leaderboard_rank_snapshots (
  mode           TEXT NOT NULL,
  period         TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rank           INTEGER NOT NULL,
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (mode, period, user_id)
);

CREATE INDEX idx_leaderboard_rank_snapshots_lookup
  ON public.leaderboard_rank_snapshots(mode, period);

-- Ranks aren't sensitive and every viewer needs to see movement for the whole
-- list, not just their own row.
ALTER TABLE public.leaderboard_rank_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaderboard_rank_snapshots_select" ON public.leaderboard_rank_snapshots
  FOR SELECT USING (true);
