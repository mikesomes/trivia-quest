-- Add session_round to scores so classic leaderboard can display "Round N, Q M"
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS session_round INTEGER NOT NULL DEFAULT 1;

-- Classic leaderboard: best session per user ranked by session XP
CREATE OR REPLACE VIEW public.classic_leaderboard_weekly AS
WITH best AS (
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    s.session_xp_earned,
    s.session_round,
    s.total_questions
  FROM public.scores s
  JOIN public.rounds r ON r.id = s.round_id
  WHERE s.completed_at >= date_trunc('week', NOW())
    AND NOT r.is_blitz
    AND NOT r.is_survival
    AND NOT r.is_quest
  ORDER BY s.user_id, s.session_xp_earned DESC
)
SELECT
  u.id           AS user_id,
  u.display_name,
  u.level,
  b.session_xp_earned,
  b.session_round,
  b.total_questions,
  RANK() OVER (ORDER BY b.session_xp_earned DESC) AS rank
FROM best b
JOIN public.users u ON u.id = b.user_id;

CREATE OR REPLACE VIEW public.classic_leaderboard_alltime AS
WITH best AS (
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    s.session_xp_earned,
    s.session_round,
    s.total_questions
  FROM public.scores s
  JOIN public.rounds r ON r.id = s.round_id
  WHERE NOT r.is_blitz
    AND NOT r.is_survival
    AND NOT r.is_quest
  ORDER BY s.user_id, s.session_xp_earned DESC
)
SELECT
  u.id           AS user_id,
  u.display_name,
  u.level,
  b.session_xp_earned,
  b.session_round,
  b.total_questions,
  RANK() OVER (ORDER BY b.session_xp_earned DESC) AS rank
FROM best b
JOIN public.users u ON u.id = b.user_id;

-- Blitz leaderboard: best single run ranked by correct answers
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
