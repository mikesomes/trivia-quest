CREATE TABLE public.question_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_question_flag UNIQUE (question_id, user_id)
);

ALTER TABLE public.question_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own flags"
  ON public.question_flags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own flags"
  ON public.question_flags FOR SELECT
  USING (auth.uid() = user_id);
