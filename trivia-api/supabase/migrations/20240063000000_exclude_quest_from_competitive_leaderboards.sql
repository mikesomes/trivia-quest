-- Quest rounds began writing `scores` rows when the `is_quest` guard was removed
-- from submit-xp (quest players were previously losing their per-question XP
-- entirely). That makes them visible to every leaderboard view for the first
-- time, so the exclusions have to be made explicit.
--
-- Quest rounds are not comparable to free play: the campaign assigns the
-- category and difficulty mix, and level perks grant extra lives and hammers.
-- `classic_leaderboard_*` already excluded them (20240050); `blitz_leaderboard_*`
-- and `leaderboard_by_category` did not.
--
-- The XP boards (`xp_leaderboard_daily/weekly`, `leaderboard_all_time`) are
-- deliberately left alone — those rank total XP earned, and quest XP is
-- legitimately earned.

-- Category board: same reasoning as the daily-challenge exclusion in 20240055 —
-- the player did not choose the category, the campaign did.
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
WHERE NOT r.is_daily_challenge
  AND NOT r.is_quest
GROUP BY s.category, u.id, u.display_name, u.level;

-- Blitz board ranks a best single run by correct answers. A quest node with
-- game_mode 'blitz' sets is_blitz, so without this filter curated quest runs
-- would rank against free-play runs.
CREATE OR REPLACE VIEW public.blitz_leaderboard_weekly AS
WITH best AS (
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    s.correct_count,
    s.xp_earned
  FROM public.scores s
  JOIN public.rounds r ON r.id = s.round_id
  WHERE s.completed_at >= date_trunc('week', NOW())
    AND r.is_blitz = true
    AND NOT r.is_quest
  ORDER BY s.user_id, s.correct_count DESC, s.xp_earned DESC
)
SELECT
  u.id           AS user_id,
  u.display_name,
  u.level,
  b.correct_count,
  b.xp_earned,
  RANK() OVER (ORDER BY b.correct_count DESC, b.xp_earned DESC) AS rank
FROM best b
JOIN public.users u ON u.id = b.user_id;

CREATE OR REPLACE VIEW public.blitz_leaderboard_alltime AS
WITH best AS (
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    s.correct_count,
    s.xp_earned
  FROM public.scores s
  JOIN public.rounds r ON r.id = s.round_id
  WHERE r.is_blitz = true
    AND NOT r.is_quest
  ORDER BY s.user_id, s.correct_count DESC, s.xp_earned DESC
)
SELECT
  u.id           AS user_id,
  u.display_name,
  u.level,
  b.correct_count,
  b.xp_earned,
  RANK() OVER (ORDER BY b.correct_count DESC, b.xp_earned DESC) AS rank
FROM best b
JOIN public.users u ON u.id = b.user_id;
