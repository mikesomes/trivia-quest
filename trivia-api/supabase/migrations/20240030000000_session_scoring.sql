-- Add per-round xp_earned so we can sum session XP without re-deriving it.
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS xp_earned INTEGER NOT NULL DEFAULT 0;

-- Add cumulative session score: sum of all rounds played back-to-back in one sitting.
-- For round 1 of any session this equals total_score.
-- For round N it equals sum(total_score for rounds 1..N in the session).
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS session_score INTEGER NOT NULL DEFAULT 0;

-- Back-fill existing rows: session_score = total_score (single-round behaviour).
UPDATE public.scores SET session_score = total_score WHERE session_score = 0;

-- Leaderboard views: rank on best session_score per user (was total_score).
-- A player who chains 4 rounds scores higher than one who played only 1 round,
-- rewarding persistence alongside skill.

CREATE OR REPLACE VIEW public.leaderboard_today AS
SELECT
  u.id          AS user_id,
  u.display_name,
  u.level,
  MAX(s.session_score) AS best_score,
  COUNT(s.id)   AS games_played,
  RANK() OVER (ORDER BY MAX(s.session_score) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
WHERE s.completed_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
GROUP BY u.id, u.display_name, u.level;

CREATE OR REPLACE VIEW public.leaderboard_weekly AS
SELECT
  u.id          AS user_id,
  u.display_name,
  u.level,
  MAX(s.session_score) AS best_score,
  COUNT(s.id)   AS games_played,
  RANK() OVER (ORDER BY MAX(s.session_score) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
WHERE s.completed_at >= date_trunc('week', now())
GROUP BY u.id, u.display_name, u.level;

CREATE OR REPLACE VIEW public.leaderboard_all_time AS
SELECT
  u.id          AS user_id,
  u.display_name,
  u.level,
  MAX(s.session_score) AS best_score,
  COUNT(s.id)   AS games_played,
  RANK() OVER (ORDER BY MAX(s.session_score) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
GROUP BY u.id, u.display_name, u.level;
