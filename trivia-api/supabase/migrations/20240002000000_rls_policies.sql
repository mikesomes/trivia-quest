-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "Users can read all profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- QUESTION_BANK policies
CREATE POLICY "Authenticated users can read active questions"
  ON public.question_bank FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ROUNDS policies
CREATE POLICY "Users can read own rounds"
  ON public.rounds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ROUND_QUESTIONS policies
CREATE POLICY "Users can read own round questions"
  ON public.round_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      WHERE r.id = round_id AND r.user_id = auth.uid()
    )
  );

-- ANSWERS policies
CREATE POLICY "Users can read own answers"
  ON public.answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      WHERE r.id = round_id AND r.user_id = auth.uid()
    )
  );

-- SCORES policies
CREATE POLICY "Anyone can read scores (leaderboard)"
  ON public.scores FOR SELECT
  TO authenticated
  USING (true);
