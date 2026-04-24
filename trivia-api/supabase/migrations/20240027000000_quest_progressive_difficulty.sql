-- ============================================================
-- QUEST DIFFICULTY TUNING
-- Tier 1: Progressive pass thresholds + zone unlock levels
--
-- pass_threshold  = minimum accuracy to pass (earn ≥1 star)
-- star_2_threshold = accuracy for 2 stars
-- star_3_threshold = accuracy for 3 stars (perfect or near)
-- unlock_level     = player level required to attempt node
-- ============================================================

-- ── ZONE 1: General Knowledge (unlock: level 1) ─────────────
UPDATE quest_nodes SET pass_threshold=0.60, star_2_threshold=0.80, star_3_threshold=1.00, unlock_level=1  WHERE id='gk_1';
UPDATE quest_nodes SET pass_threshold=0.65, star_2_threshold=0.82, star_3_threshold=1.00, unlock_level=1  WHERE id='gk_2a';
UPDATE quest_nodes SET pass_threshold=0.65, star_2_threshold=0.82, star_3_threshold=1.00, unlock_level=1  WHERE id='gk_2b';
UPDATE quest_nodes SET pass_threshold=0.75, star_2_threshold=0.88, star_3_threshold=1.00, unlock_level=1  WHERE id='gk_boss';

-- ── ZONE 2: History (unlock: level 3) ───────────────────────
UPDATE quest_nodes SET pass_threshold=0.65, star_2_threshold=0.82, star_3_threshold=1.00, unlock_level=3  WHERE id='hist_1a';
UPDATE quest_nodes SET pass_threshold=0.65, star_2_threshold=0.82, star_3_threshold=1.00, unlock_level=3  WHERE id='hist_1b';
UPDATE quest_nodes SET pass_threshold=0.70, star_2_threshold=0.85, star_3_threshold=1.00, unlock_level=3  WHERE id='hist_2';
UPDATE quest_nodes SET pass_threshold=0.78, star_2_threshold=0.90, star_3_threshold=1.00, unlock_level=3  WHERE id='hist_boss';

-- ── ZONE 3: Science (unlock: level 6) ───────────────────────
UPDATE quest_nodes SET pass_threshold=0.65, star_2_threshold=0.82, star_3_threshold=1.00, unlock_level=6  WHERE id='sci_1a';
UPDATE quest_nodes SET pass_threshold=0.65, star_2_threshold=0.82, star_3_threshold=1.00, unlock_level=6  WHERE id='sci_1b';
UPDATE quest_nodes SET pass_threshold=0.70, star_2_threshold=0.85, star_3_threshold=1.00, unlock_level=6  WHERE id='sci_2';
UPDATE quest_nodes SET pass_threshold=0.80, star_2_threshold=0.90, star_3_threshold=1.00, unlock_level=6  WHERE id='sci_boss';

-- ── ZONE 4: Sports (unlock: level 9) ────────────────────────
UPDATE quest_nodes SET pass_threshold=0.70, star_2_threshold=0.85, star_3_threshold=1.00, unlock_level=9  WHERE id='sports_1a';
UPDATE quest_nodes SET pass_threshold=0.70, star_2_threshold=0.85, star_3_threshold=1.00, unlock_level=9  WHERE id='sports_1b';
UPDATE quest_nodes SET pass_threshold=0.75, star_2_threshold=0.88, star_3_threshold=1.00, unlock_level=9  WHERE id='sports_2';
UPDATE quest_nodes SET pass_threshold=0.82, star_2_threshold=0.92, star_3_threshold=1.00, unlock_level=9  WHERE id='sports_boss';

-- ── ZONE 5: Entertainment (unlock: level 12) ────────────────
UPDATE quest_nodes SET pass_threshold=0.70, star_2_threshold=0.85, star_3_threshold=1.00, unlock_level=12 WHERE id='ent_1a';
UPDATE quest_nodes SET pass_threshold=0.70, star_2_threshold=0.85, star_3_threshold=1.00, unlock_level=12 WHERE id='ent_1b';
UPDATE quest_nodes SET pass_threshold=0.75, star_2_threshold=0.88, star_3_threshold=1.00, unlock_level=12 WHERE id='ent_2';
UPDATE quest_nodes SET pass_threshold=0.82, star_2_threshold=0.92, star_3_threshold=1.00, unlock_level=12 WHERE id='ent_boss';

-- ── SPECIAL CHALLENGES (unlock: level 15) ───────────────────
UPDATE quest_nodes SET pass_threshold=0.75, star_2_threshold=0.88, star_3_threshold=1.00, unlock_level=15 WHERE id='geo_1';
UPDATE quest_nodes SET pass_threshold=0.85, star_2_threshold=0.93, star_3_threshold=1.00, unlock_level=15 WHERE id='nfl_1';
UPDATE quest_nodes SET pass_threshold=0.85, star_2_threshold=0.93, star_3_threshold=1.00, unlock_level=15 WHERE id='roman_1';

-- ── GRAND GAUNTLET (unlock: level 20) ───────────────────────
UPDATE quest_nodes SET pass_threshold=0.90, star_2_threshold=0.95, star_3_threshold=1.00, unlock_level=20 WHERE id='grand';
