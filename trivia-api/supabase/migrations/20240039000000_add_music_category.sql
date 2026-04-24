ALTER TABLE public.question_bank
  DROP CONSTRAINT valid_category,
  ADD CONSTRAINT valid_category CHECK (category IN ('general_knowledge','history','science','sports','movies_tv','geography','nfl_football','roman_history','harry_potter','famous_quotes','music'));
