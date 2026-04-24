-- Function: increment_times_used
-- Atomically increments times_used and sets last_used_at for a batch of questions.
CREATE OR REPLACE FUNCTION public.increment_times_used(question_ids UUID[])
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.question_bank
  SET
    times_used   = times_used + 1,
    last_used_at = now()
  WHERE id = ANY(question_ids);
$$;
