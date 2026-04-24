-- Classic leaderboard: best score per user today
CREATE OR REPLACE VIEW public.leaderboard_today AS
SELECT
  u.id AS user_id,
  u.display_name,
  u.level,
  MAX(s.total_score) AS best_score,
  COUNT(s.id) AS games_played,
  RANK() OVER (ORDER BY MAX(s.total_score) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
WHERE s.completed_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
GROUP BY u.id, u.display_name, u.level;
