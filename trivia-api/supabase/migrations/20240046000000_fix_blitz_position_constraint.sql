-- Blitz rounds use 30 questions (positions 0-29) but the original constraint
-- only allowed 0-9. Widen to cover blitz.

ALTER TABLE public.round_questions
  DROP CONSTRAINT IF EXISTS valid_position;

ALTER TABLE public.round_questions
  ADD CONSTRAINT valid_position CHECK (position BETWEEN 0 AND 29);
