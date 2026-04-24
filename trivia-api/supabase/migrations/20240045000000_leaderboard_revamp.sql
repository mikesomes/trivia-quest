-- Leaderboard revamp: add global (by total XP) and per-category views.
-- Also renames the survival XP column semantically (adds xp_earned, keeps
-- total_score as a legacy mirror) so sudden-death ranking can move off
-- questions_answered onto pure XP.

ALTER TABLE public.sudden_death_scores
  ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0;

UPDATE public.sudden_death_scores
SET xp_earned = total_score
WHERE xp_earned = 0;

CREATE INDEX IF NOT EXISTS idx_sd_scores_xp
  ON public.sudden_death_scores (xp_earned DESC);

CREATE INDEX IF NOT EXISTS idx_users_xp
  ON public.users (xp DESC);

CREATE OR REPLACE VIEW public.leaderboard_global AS
SELECT
  u.id           AS user_id,
  u.display_name,
  u.level,
  u.xp           AS total_xp,
  RANK() OVER (ORDER BY u.xp DESC) AS rank
FROM public.users u
WHERE u.xp > 0;

CREATE OR REPLACE VIEW public.leaderboard_by_category AS
SELECT
  s.category,
  u.id           AS user_id,
  u.display_name,
  u.level,
  SUM(s.xp_earned)::INTEGER   AS category_xp,
  COUNT(s.id)::INTEGER        AS games_played,
  RANK() OVER (PARTITION BY s.category ORDER BY SUM(s.xp_earned) DESC) AS rank
FROM public.scores s
JOIN public.users u ON u.id = s.user_id
GROUP BY s.category, u.id, u.display_name, u.level;
