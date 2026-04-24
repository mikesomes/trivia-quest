-- Drop the original 3-parameter version of get_random_questions.
-- The 4-parameter version (with optional p_user_id) was added in migration
-- 20240007 but CREATE OR REPLACE with a different signature created a second
-- overload instead of replacing the original, causing PGRST203 ambiguity.
DROP FUNCTION IF EXISTS public.get_random_questions(TEXT, TEXT, INTEGER);
