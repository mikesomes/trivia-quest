ALTER FUNCTION public.award_challenge_xp(UUID, INTEGER) SECURITY DEFINER;
ALTER FUNCTION public.award_challenge_xp(UUID, INTEGER) SET search_path = public;

REVOKE ALL ON FUNCTION public.award_challenge_xp(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_challenge_xp(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.award_challenge_xp(UUID, INTEGER) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.award_challenge_xp(UUID, INTEGER) TO service_role;
