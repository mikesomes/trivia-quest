-- Users indexes
CREATE INDEX idx_users_level_xp ON public.users (level DESC, xp DESC);
CREATE INDEX idx_users_display_name ON public.users (display_name);

-- Question bank indexes
CREATE INDEX idx_questions_category_difficulty ON public.question_bank (category, difficulty, is_active);
CREATE INDEX idx_questions_times_used ON public.question_bank (times_used ASC) WHERE is_active = true;
CREATE INDEX idx_questions_active ON public.question_bank (is_active) WHERE is_active = true;

-- Rounds indexes
CREATE INDEX idx_rounds_user_status ON public.rounds (user_id, status);
CREATE INDEX idx_rounds_expires ON public.rounds (expires_at) WHERE status = 'active';

-- Round questions indexes
CREATE INDEX idx_round_questions_round ON public.round_questions (round_id, position);

-- Answers indexes
CREATE INDEX idx_answers_round ON public.answers (round_id, position);

-- Scores indexes
CREATE INDEX idx_scores_user_score ON public.scores (user_id, total_score DESC);
CREATE INDEX idx_scores_completed_at ON public.scores (completed_at DESC);
CREATE INDEX idx_scores_total_score ON public.scores (total_score DESC);
-- Weekly leaderboard filtering is handled by the leaderboard_weekly view (no partial index needed)
