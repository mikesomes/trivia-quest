CREATE TABLE public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  xp_awarded BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_challenge_period UNIQUE (user_id, challenge_id, period_start)
);

ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenge progress"
  ON public.user_challenge_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_challenge_progress_lookup
  ON public.user_challenge_progress (user_id, period_start);
