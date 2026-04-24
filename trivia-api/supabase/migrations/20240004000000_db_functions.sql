-- Trigger: create user profile when auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_name TEXT;
BEGIN
  -- Generate a random display name for new users
  generated_name := 'Player_' || upper(substr(md5(random()::text), 1, 6));

  INSERT INTO public.users (id, display_name, is_anonymous)
  VALUES (
    NEW.id,
    generated_name,
    COALESCE((NEW.raw_app_meta_data->>'provider') = 'anonymous', true)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- View: leaderboard_all_time (best score per user, all time)
CREATE OR REPLACE VIEW public.leaderboard_all_time AS
SELECT
  u.id AS user_id,
  u.display_name,
  u.level,
  MAX(s.total_score) AS best_score,
  COUNT(s.id) AS games_played,
  RANK() OVER (ORDER BY MAX(s.total_score) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
GROUP BY u.id, u.display_name, u.level;

-- View: leaderboard_weekly (best score per user this week)
CREATE OR REPLACE VIEW public.leaderboard_weekly AS
SELECT
  u.id AS user_id,
  u.display_name,
  u.level,
  MAX(s.total_score) AS best_score,
  COUNT(s.id) AS games_played,
  RANK() OVER (ORDER BY MAX(s.total_score) DESC) AS rank
FROM public.users u
JOIN public.scores s ON s.user_id = u.id
WHERE s.completed_at >= date_trunc('week', now())
GROUP BY u.id, u.display_name, u.level;

-- Function: get XP needed to reach level n
CREATE OR REPLACE FUNCTION public.xp_for_level(n INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  -- Sum of 100*i^2 for i=1 to n-1 (XP needed to BE at level n)
  SELECT COALESCE(
    (SELECT SUM((100 * i * i)::INTEGER)
     FROM generate_series(1, n-1) AS i),
    0
  );
$$;

-- Function: compute current level from total XP
CREATE OR REPLACE FUNCTION public.level_from_xp(total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  lvl INTEGER := 1;
BEGIN
  WHILE public.xp_for_level(lvl + 1) <= total_xp LOOP
    lvl := lvl + 1;
    EXIT WHEN lvl >= 100; -- safety cap
  END LOOP;
  RETURN lvl;
END;
$$;
