-- Phase 2: Multi-round quest nodes + run tracking
--
-- quest_node_rounds defines the ordered rounds for a multi-round node.
-- When absent for a node, that node behaves as a single-round node (backward compatible).
--
-- user_quest_node_run tracks one user attempt across all rounds.
-- A run is created by /start-quest-node-run and advanced by /complete-quest-node.

-- ────────────────────────────────────────────────────────────
-- quest_node_rounds
-- ────────────────────────────────────────────────────────────
CREATE TABLE quest_node_rounds (
  node_id       TEXT        NOT NULL REFERENCES quest_nodes(id) ON DELETE CASCADE,
  round_index   INTEGER     NOT NULL CHECK (round_index >= 0),
  game_mode     TEXT        NOT NULL DEFAULT 'classic',
  category      TEXT,                -- NULL → inherit from quest_node
  difficulty    TEXT        NOT NULL DEFAULT 'medium',
  pass_threshold FLOAT      NOT NULL DEFAULT 0.7,
  mode_config   JSONB       NOT NULL DEFAULT '{}',
  PRIMARY KEY (node_id, round_index)
);

-- ────────────────────────────────────────────────────────────
-- user_quest_node_run
-- ────────────────────────────────────────────────────────────
CREATE TABLE user_quest_node_run (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id             TEXT        NOT NULL REFERENCES quest_nodes(id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  current_round_index INTEGER     NOT NULL DEFAULT 0,
  rounds_total        INTEGER     NOT NULL DEFAULT 1,
  rounds_passed       INTEGER     NOT NULL DEFAULT 0,
  aggregate_stars     INTEGER     NOT NULL DEFAULT 0,
  status              TEXT        NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'passed', 'failed', 'abandoned')),
  last_round_id       UUID        -- the most recently created round for this run
);

CREATE INDEX user_quest_node_run_user_node
  ON user_quest_node_run (user_id, node_id, status);

-- ────────────────────────────────────────────────────────────
-- rounds: link back to a run
-- ────────────────────────────────────────────────────────────
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS quest_run_id UUID REFERENCES user_quest_node_run(id),
  ADD COLUMN IF NOT EXISTS quest_run_round_index INTEGER;

-- ────────────────────────────────────────────────────────────
-- Seed: 3-round mixed-mode test node (dev only)
-- ────────────────────────────────────────────────────────────
-- Insert the parent quest node for the multi-round test
INSERT INTO quest_nodes (
  id, title, description, category, difficulty, game_mode,
  branch, position_x, position_y,
  pass_threshold, star_2_threshold, star_3_threshold,
  xp_reward, unlock_level, is_active
) VALUES (
  'multi_test_1',
  'The Gauntlet',
  'Three-round challenge: classic → blitz → survival',
  'general_knowledge', 'hard', 'classic',
  'special', 400, 600,
  0.7, 0.8, 0.9,
  300, 1, true
) ON CONFLICT (id) DO NOTHING;

-- Per-round definitions for multi_test_1
INSERT INTO quest_node_rounds (node_id, round_index, game_mode, difficulty, pass_threshold, mode_config) VALUES
  ('multi_test_1', 0, 'classic',  'medium', 0.7,  '{}'),
  ('multi_test_1', 1, 'blitz',    'medium', 0.0,  '{"duration_seconds":60,"min_correct_to_pass":8,"star_2_correct":14,"star_3_correct":20}'),
  ('multi_test_1', 2, 'survival', 'hard',   0.0,  '{"target_streak":6,"escalate_every":4,"star_2_streak":10,"star_3_streak":16}')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Seed: 3-phase boss re-definition (hub_boss_1 if it exists)
-- ────────────────────────────────────────────────────────────
-- Only adds rounds — node row itself is already seeded by earlier migrations.
INSERT INTO quest_node_rounds (node_id, round_index, game_mode, difficulty, pass_threshold, mode_config)
SELECT 'hub_boss_1', rounds.round_index, rounds.game_mode, rounds.difficulty, rounds.pass_threshold, rounds.mode_config
FROM (VALUES
  (0, 'classic',  'hard', 0.7,  '{}'::jsonb),
  (1, 'blitz',    'hard', 0.0,  '{"duration_seconds":60,"min_correct_to_pass":10,"star_2_correct":16,"star_3_correct":22}'::jsonb),
  (2, 'survival', 'hard', 0.0,  '{"target_streak":8,"escalate_every":3,"star_2_streak":12,"star_3_streak":18}'::jsonb)
) AS rounds(round_index, game_mode, difficulty, pass_threshold, mode_config)
WHERE EXISTS (SELECT 1 FROM quest_nodes WHERE id = 'hub_boss_1')
ON CONFLICT DO NOTHING;
