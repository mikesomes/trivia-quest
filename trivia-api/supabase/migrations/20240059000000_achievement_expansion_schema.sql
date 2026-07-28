-- Achievement expansion, schema half. Two new data sources so achievement
-- progress can be computed uniformly regardless of which mode was played:
--
--   user_category_stats — correct-answer count per category, incremented in
--   submit-answer (the one function every mode's per-question flow goes
--   through), feeding category-mastery achievements.
--
--   best_survival_depth / best_blitz_correct — denormalized personal bests
--   on users, updated where those modes actually submit (submit-sudden-death,
--   submit-xp), avoiding a scan of sudden_death_scores/scores per check.
CREATE TABLE public.user_category_stats (
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, category)
);

ALTER TABLE public.user_category_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_category_stats_own" ON public.user_category_stats
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.users
  ADD COLUMN best_survival_depth INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN best_blitz_correct INTEGER NOT NULL DEFAULT 0;
