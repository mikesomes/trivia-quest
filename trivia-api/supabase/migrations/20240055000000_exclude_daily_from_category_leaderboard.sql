-- Daily-challenge rounds use a mixed question set; their round.category is the
-- majority category of the day's set, not a category the player chose. Excluding
-- them keeps category leaderboards a ranking of deliberate category play only.
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
JOIN public.rounds r ON r.id = s.round_id
WHERE COALESCE(r.is_daily_challenge, false) = false
GROUP BY s.category, u.id, u.display_name, u.level;
