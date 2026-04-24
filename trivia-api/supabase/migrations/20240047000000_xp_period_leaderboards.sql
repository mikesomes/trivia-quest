-- New views for XP-based period leaderboards.
-- Uses SUM(xp_earned) within the window (not best single session) so the
-- weekly and daily boards reward sustained play, not just one lucky run.

CREATE OR REPLACE VIEW public.xp_leaderboard_weekly AS
SELECT
  u.id           AS user_id,
  u.display_name,
  u.level,
  SUM(s.xp_earned)::INTEGER  AS weekly_xp,
  COUNT(s.id)::INTEGER       AS games_played,
  RANK() OVER (ORDER BY SUM(s.xp_earned) DESC) AS rank
FROM public.scores s
JOIN public.users u ON u.id = s.user_id
WHERE s.completed_at >= date_trunc('week', NOW())
  AND s.xp_earned > 0
GROUP BY u.id, u.display_name, u.level;

CREATE OR REPLACE VIEW public.xp_leaderboard_daily AS
SELECT
  u.id           AS user_id,
  u.display_name,
  u.level,
  SUM(s.xp_earned)::INTEGER  AS daily_xp,
  COUNT(s.id)::INTEGER       AS games_played,
  RANK() OVER (ORDER BY SUM(s.xp_earned) DESC) AS rank
FROM public.scores s
JOIN public.users u ON u.id = s.user_id
WHERE s.completed_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
  AND s.xp_earned > 0
GROUP BY u.id, u.display_name, u.level;
