-- XP is now the gameplay/run metric. Legacy score-named columns remain as
-- compatibility storage, but leaderboards and profile bests read them as XP.

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS session_xp_earned INTEGER NOT NULL DEFAULT 0;

-- Preserve historical rows by treating their stored run metric as XP.
UPDATE public.scores
SET xp_earned = total_score
WHERE xp_earned = 0;

UPDATE public.scores
SET session_xp_earned = COALESCE(NULLIF(session_score, 0), xp_earned, total_score)
WHERE session_xp_earned = 0;

-- Keep old compatibility columns aligned for readers that have not yet moved
-- to the XP-specific names.
UPDATE public.scores
SET total_score = xp_earned,
    session_score = session_xp_earned;

UPDATE public.users u
SET best_score = COALESCE(best.best_xp, 0)
FROM (
  SELECT user_id, MAX(session_xp_earned) AS best_xp
  FROM public.scores
  GROUP BY user_id
) best
WHERE best.user_id = u.id;

CREATE INDEX IF NOT EXISTS idx_scores_session_xp
  ON public.scores (session_xp_earned DESC);

-- These three views are dropped and recreated rather than replaced. 20240030
-- defined their fourth column as `best_score`; here it becomes `best_xp`, and
-- CREATE OR REPLACE VIEW cannot rename a column ("cannot change name of view
-- column"). On the databases where this migration already ran the statements
-- below are equivalent, but a replay from scratch — a fresh environment or a
-- restore — used to fail here.
--
-- Deliberately not CASCADE: nothing reads these (the live boards are
-- xp_/classic_/blitz_leaderboard_*, and no edge function queries them), so a
-- dependency appearing later should fail loudly instead of being dropped.
DROP VIEW IF EXISTS public.leaderboard_today;
CREATE VIEW public.leaderboard_today AS
SELECT
  u.id          AS user_id,
  u.display_name,
  u.level,
  MAX(s.session_xp_earned) AS best_xp,
  COUNT(s.id)   AS games_played,
  RANK() OVER (ORDER BY MAX(s.session_xp_earned) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
WHERE s.completed_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
GROUP BY u.id, u.display_name, u.level;

DROP VIEW IF EXISTS public.leaderboard_weekly;
CREATE VIEW public.leaderboard_weekly AS
SELECT
  u.id          AS user_id,
  u.display_name,
  u.level,
  MAX(s.session_xp_earned) AS best_xp,
  COUNT(s.id)   AS games_played,
  RANK() OVER (ORDER BY MAX(s.session_xp_earned) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
WHERE s.completed_at >= date_trunc('week', now())
GROUP BY u.id, u.display_name, u.level;

DROP VIEW IF EXISTS public.leaderboard_all_time;
CREATE VIEW public.leaderboard_all_time AS
SELECT
  u.id          AS user_id,
  u.display_name,
  u.level,
  MAX(s.session_xp_earned) AS best_xp,
  COUNT(s.id)   AS games_played,
  RANK() OVER (ORDER BY MAX(s.session_xp_earned) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
GROUP BY u.id, u.display_name, u.level;

UPDATE public.achievements
SET name = 'High XP',
    description = 'Earn 500 XP in a single round'
WHERE id = 'high_scorer';

UPDATE public.achievements
SET description = 'Earn 1,500 XP in a session'
WHERE id = 'big_brain';
