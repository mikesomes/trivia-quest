-- ============================================================
-- QUEST MODE_CONFIG
-- Phase 1: Per-node mode configuration + per-round mode state.
--
-- mode_config on quest_nodes tunes each mode's pass criteria:
--   blitz:    { duration_seconds, min_correct_to_pass, star_2_correct, star_3_correct }
--   survival: { target_streak, escalate_every, star_2_streak, star_3_streak }
--   streak:   { target_streak, star_2_streak, star_3_streak }
--   classic / boss_battle: {} (uses existing accuracy thresholds)
--
-- rounds.mode_config mirrors the node's config at round-create time
-- so the round is self-contained and can't desync if the node is tuned later.
--
-- rounds.max_streak records the highest streak reached during the round
-- so /complete-quest-node can evaluate survival/streak pass criteria.
-- ============================================================

ALTER TABLE public.quest_nodes
  ADD COLUMN IF NOT EXISTS mode_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS mode_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS max_streak INTEGER NOT NULL DEFAULT 0;

-- ── Seed mode_config for existing blitz nodes ───────────────
UPDATE quest_nodes SET mode_config = jsonb_build_object(
  'duration_seconds',    60,
  'min_correct_to_pass', 8,
  'star_2_correct',      14,
  'star_3_correct',      20
) WHERE game_mode = 'blitz';

-- ── Seed mode_config for existing streak nodes ──────────────
UPDATE quest_nodes SET mode_config = jsonb_build_object(
  'target_streak', 6,
  'star_2_streak', 10,
  'star_3_streak', 15
) WHERE game_mode = 'streak';

-- ── Convert one existing easy node into a survival test node ──
--     Picks sci_1a (already exists, easy science) and rebrands it.
--     This gives Phase 1 a playable survival node without adding new rows.
UPDATE quest_nodes
SET
  title        = 'Lab Survival',
  description  = 'One wrong answer ends the run.',
  game_mode    = 'survival',
  mode_config  = jsonb_build_object(
    'target_streak',  8,
    'escalate_every', 4,
    'star_2_streak',  12,
    'star_3_streak',  18
  )
WHERE id = 'sci_1a';
