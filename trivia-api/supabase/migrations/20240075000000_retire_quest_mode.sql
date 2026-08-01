-- Retire quest mode.
--
-- The Knowledge Isles region (20240062) shipped five nodes — ki_arrival,
-- ki_observatory, ki_archive, ki_tempest, ki_summit — all on the
-- general_knowledge category and all at unlock_level 1. That is roughly fifty
-- questions, and claim_quest_node_reward only pays out on a first clear
-- (previousStars = 0), so the mode was exhausted after a single session while
-- occupying the home screen's hero slot. The machinery behind it — a loot
-- ledger, cooldowns, an unlock DAG and a multi-round run state machine — was
-- far larger than the content it served, and quest_node_rounds never had a
-- single row for any ki_ node, so the multi-round system was already dead.
--
-- This follows the same trim as the daily chest removal and 20240074
-- (Odd One Out): the app is refocusing on its trivia modes and daily loop.
--
-- Rows are deactivated rather than dropped, for stronger reasons than the
-- category retirements. user_quest_progress and quest_node_reward_claims hold
-- real player history (stars earned, loot already granted), and the reward
-- ledger's UNIQUE (user_id, node_id) is what makes a first-clear payout
-- idempotent — dropping it would let a rebuilt quest mode pay the same clear
-- twice. Keeping the schema also means progression can be rebuilt later
-- without a restore.
--
-- The client no longer renders a map and the get-quest-map /
-- start-quest-node-run / complete-quest-node functions are deleted, so nothing
-- reads these rows any more; create-round no longer accepts isQuest at all.

UPDATE public.quest_nodes
SET is_active = false;
