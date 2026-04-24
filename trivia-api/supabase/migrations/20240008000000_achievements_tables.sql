-- Achievement definitions (static catalogue)
CREATE TABLE public.achievements (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  rarity      TEXT NOT NULL DEFAULT 'common' -- common | rare | epic | legendary
);

-- Per-user earned achievements (unique constraint prevents double-awarding)
CREATE TABLE public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id),
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

-- RLS: users can only read their own achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Achievements catalogue is public-readable
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read achievements"
  ON public.achievements FOR SELECT
  USING (true);
