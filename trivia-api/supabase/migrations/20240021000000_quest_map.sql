-- Quest nodes (the map)
CREATE TABLE public.quest_nodes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'boss')),
  game_mode TEXT NOT NULL CHECK (game_mode IN ('classic', 'blitz', 'survival', 'boss_battle', 'streak')),
  branch TEXT NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  pass_threshold FLOAT NOT NULL DEFAULT 0.6,
  star_2_threshold FLOAT NOT NULL DEFAULT 0.8,
  star_3_threshold FLOAT NOT NULL DEFAULT 1.0,
  unlock_level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Directed edges between nodes
CREATE TABLE public.quest_node_connections (
  from_node_id TEXT NOT NULL REFERENCES public.quest_nodes(id) ON DELETE CASCADE,
  to_node_id TEXT NOT NULL REFERENCES public.quest_nodes(id) ON DELETE CASCADE,
  PRIMARY KEY (from_node_id, to_node_id)
);

-- Per-user completion records
CREATE TABLE public.user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL REFERENCES public.quest_nodes(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  best_score INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_node UNIQUE (user_id, node_id)
);

ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quest progress"
  ON public.user_quest_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_quest_progress_user ON public.user_quest_progress (user_id);
