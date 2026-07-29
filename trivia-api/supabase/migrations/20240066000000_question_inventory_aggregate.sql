-- Count the question bank in the database instead of in JavaScript.
--
-- getQuestionInventory selected every active row and counted them in a loop,
-- purely to learn how many there are per category/difficulty. That was
-- affordable when the bank was a few hundred rows; it is now 11,525, read in
-- full on every topUpAll invocation before any work begins.

CREATE OR REPLACE FUNCTION public.get_question_inventory()
RETURNS TABLE (
  category   TEXT,
  difficulty TEXT,
  count      INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT qb.category, qb.difficulty, COUNT(*)::INTEGER
  FROM public.question_bank qb
  WHERE qb.is_active = true
  GROUP BY qb.category, qb.difficulty;
$$;

ALTER FUNCTION public.get_question_inventory() SET search_path = public;

REVOKE ALL ON FUNCTION public.get_question_inventory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_question_inventory() FROM anon;
REVOKE ALL ON FUNCTION public.get_question_inventory() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_question_inventory() TO service_role;
