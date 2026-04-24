CREATE OR REPLACE FUNCTION public.award_challenge_xp(p_user_id UUID, p_xp INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET xp = xp + p_xp,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
