-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS table (mirrors auth.users, populated by trigger)
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_games INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 30)
);

-- QUESTION_BANK table
CREATE TABLE public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL,
  explanation TEXT,
  content_hash TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'openai-gpt4o-mini',
  times_used INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_category CHECK (category IN ('general_knowledge','history','science','sports','movies_tv','geography')),
  CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy','medium','hard')),
  CONSTRAINT valid_correct_option CHECK (correct_option IN ('a','b','c','d')),
  CONSTRAINT content_hash_unique UNIQUE (content_hash)
);

-- ROUNDS table
CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  lives_remaining INTEGER NOT NULL DEFAULT 3,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active','completed','abandoned')),
  CONSTRAINT valid_lives CHECK (lives_remaining BETWEEN 0 AND 3),
  CONSTRAINT valid_score CHECK (score >= 0)
);

-- ROUND_QUESTIONS table
CREATE TABLE public.round_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id),
  position INTEGER NOT NULL,
  presented_at TIMESTAMPTZ,
  CONSTRAINT round_position_unique UNIQUE (round_id, position),
  CONSTRAINT valid_position CHECK (position BETWEEN 0 AND 9)
);

-- ANSWERS table
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id),
  position INTEGER NOT NULL,
  selected_option CHAR(1),
  is_correct BOOLEAN NOT NULL,
  time_taken_ms INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  time_bonus INTEGER NOT NULL DEFAULT 0,
  streak_bonus INTEGER NOT NULL DEFAULT 0,
  streak_at_time INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT answer_position_unique UNIQUE (round_id, position),
  CONSTRAINT valid_selected_option CHECK (selected_option IS NULL OR selected_option IN ('a','b','c','d')),
  CONSTRAINT valid_time_taken CHECK (time_taken_ms >= 0)
);

-- SCORES table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 10,
  time_bonus_total INTEGER NOT NULL DEFAULT 0,
  streak_bonus_total INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT score_round_unique UNIQUE (round_id)
);
