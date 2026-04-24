-- ============================================================
-- QUEST MAP REDESIGN — Sequential category zones
-- Journey: General Knowledge → History → Science → Sports
--          → Entertainment → Special Challenges → Grand
--
-- Layout: 3 columns (x=0,1,2), gap rows for zone labels
-- Zone nodes:   y=1-3, 5-7, 9-11, 13-15, 17-19, 21, 23
-- Zone labels:  y=0,   4,   8,    12,    16,    20, 22
-- ============================================================

-- Clear existing data (cascades connections + user progress)
DELETE FROM public.quest_nodes;

INSERT INTO public.quest_nodes
  (id, title, description, category, difficulty, game_mode, branch, position_x, position_y, xp_reward, pass_threshold, star_2_threshold, star_3_threshold, unlock_level)
VALUES

  -- ── ZONE 1: General Knowledge (y=1–3) ──────────────────
  ('gk_1',       'Knowledge Spark',  'Where every quest begins.',         'general_knowledge', 'easy',   'classic',     'general',       1,  1, 150, 0.6, 0.8, 1.0, 1),
  ('gk_2a',      'Speed Round',      'Think fast under pressure.',        'general_knowledge', 'medium', 'classic',     'general',       0,  2, 250, 0.6, 0.8, 1.0, 1),
  ('gk_2b',      'Blitz Burst',      'Answers fly — keep up.',            'general_knowledge', 'medium', 'blitz',       'general',       2,  2, 275, 0.6, 0.8, 1.0, 1),
  ('gk_boss',    'The General',      'Prove you know everything.',        'general_knowledge', 'hard',   'boss_battle', 'general',       1,  3, 500, 0.8, 0.9, 1.0, 1),

  -- ── ZONE 2: History (y=5–7) ────────────────────────────
  ('hist_1a',    'Ancient Origins',  'The story of humanity begins.',     'history', 'easy',   'classic',     'history',       0,  5, 150, 0.6, 0.8, 1.0, 1),
  ('hist_1b',    'Timeline',         'Keep the streak alive.',            'history', 'easy',   'streak',      'history',       2,  5, 175, 0.6, 0.8, 1.0, 1),
  ('hist_2',     'Empires Rise',     'Great nations, great questions.',   'history', 'medium', 'classic',     'history',       1,  6, 250, 0.6, 0.8, 1.0, 1),
  ('hist_boss',  'The Historian',    'Only the knowledgeable survive.',   'history', 'hard',   'boss_battle', 'history',       1,  7, 500, 0.8, 0.9, 1.0, 1),

  -- ── ZONE 3: Science (y=9–11) ───────────────────────────
  ('sci_1a',     'Lab Notes',        'Curiosity is your only tool.',      'science', 'easy',   'classic',     'science',       0,  9, 150, 0.6, 0.8, 1.0, 1),
  ('sci_1b',     'Quick Discovery',  'Science at lightning speed.',       'science', 'easy',   'blitz',       'science',       2,  9, 175, 0.6, 0.8, 1.0, 1),
  ('sci_2',      'Hypothesis',       'Form your theory. Test it.',        'science', 'medium', 'classic',     'science',       1, 10, 250, 0.6, 0.8, 1.0, 1),
  ('sci_boss',   'Peer Review',      'Your answers face scrutiny.',       'science', 'hard',   'boss_battle', 'science',       1, 11, 500, 0.8, 0.9, 1.0, 1),

  -- ── ZONE 4: Sports (y=13–15) ───────────────────────────
  ('sports_1a',  'Opening Whistle',  'Step onto the field.',              'sports', 'easy',   'classic',     'sports',        0, 13, 150, 0.6, 0.8, 1.0, 1),
  ('sports_1b',  'Fast Break',       'No time to think — just play.',     'sports', 'easy',   'blitz',       'sports',        2, 13, 175, 0.6, 0.8, 1.0, 1),
  ('sports_2',   'Halftime',         'Push through to the second half.',  'sports', 'medium', 'classic',     'sports',        1, 14, 250, 0.6, 0.8, 1.0, 1),
  ('sports_boss','Championship',     'Only legends make it here.',        'sports', 'hard',   'boss_battle', 'sports',        1, 15, 500, 0.8, 0.9, 1.0, 1),

  -- ── ZONE 5: Entertainment (y=17–19) ────────────────────
  ('ent_1a',     'Opening Credits',  'Lights, camera, trivia.',           'movies_tv', 'easy',   'classic',     'entertainment', 0, 17, 150, 0.6, 0.8, 1.0, 1),
  ('ent_1b',     'Speed Watch',      'Binge-worthy and fast.',            'movies_tv', 'easy',   'blitz',       'entertainment', 2, 17, 175, 0.6, 0.8, 1.0, 1),
  ('ent_2',      'Plot Twist',       'Nothing is as it seems.',           'movies_tv', 'medium', 'classic',     'entertainment', 1, 18, 250, 0.6, 0.8, 1.0, 1),
  ('ent_boss',   'Director''s Cut',  'The version only true fans know.',  'movies_tv', 'hard',   'boss_battle', 'entertainment', 1, 19, 500, 0.8, 0.9, 1.0, 1),

  -- ── SPECIAL CHALLENGES (y=21) ──────────────────────────
  ('geo_1',      'World Tour',       'From every corner of the globe.',   'geography',     'medium', 'classic',     'special',       0, 21, 400, 0.6, 0.8, 1.0, 1),
  ('nfl_1',      'Fourth & Goal',    'Elite NFL knowledge required.',     'nfl_football',  'hard',   'boss_battle', 'special',       1, 21, 600, 0.8, 0.9, 1.0, 1),
  ('roman_1',    'Ave Caesar',       'Prove your mastery of Rome.',       'roman_history', 'hard',   'boss_battle', 'special',       2, 21, 600, 0.8, 0.9, 1.0, 1),

  -- ── GRAND CHALLENGE (y=23) ─────────────────────────────
  ('grand',      'Trivia Gauntlet',  'The ultimate test of all knowledge.','general_knowledge', 'boss', 'boss_battle', 'special', 1, 23, 1500, 0.8, 0.9, 1.0, 1);

-- ============================================================
-- CONNECTIONS
-- ============================================================
INSERT INTO public.quest_node_connections (from_node_id, to_node_id) VALUES
  -- Zone 1 internal
  ('gk_1',       'gk_2a'),
  ('gk_1',       'gk_2b'),
  ('gk_2a',      'gk_boss'),
  ('gk_2b',      'gk_boss'),

  -- Zone 1 → Zone 2
  ('gk_boss',    'hist_1a'),
  ('gk_boss',    'hist_1b'),

  -- Zone 2 internal
  ('hist_1a',    'hist_2'),
  ('hist_1b',    'hist_2'),
  ('hist_2',     'hist_boss'),

  -- Zone 2 → Zone 3
  ('hist_boss',  'sci_1a'),
  ('hist_boss',  'sci_1b'),

  -- Zone 3 internal
  ('sci_1a',     'sci_2'),
  ('sci_1b',     'sci_2'),
  ('sci_2',      'sci_boss'),

  -- Zone 3 → Zone 4
  ('sci_boss',   'sports_1a'),
  ('sci_boss',   'sports_1b'),

  -- Zone 4 internal
  ('sports_1a',  'sports_2'),
  ('sports_1b',  'sports_2'),
  ('sports_2',   'sports_boss'),

  -- Zone 4 → Zone 5
  ('sports_boss', 'ent_1a'),
  ('sports_boss', 'ent_1b'),

  -- Zone 5 internal
  ('ent_1a',     'ent_2'),
  ('ent_1b',     'ent_2'),
  ('ent_2',      'ent_boss'),

  -- Zone 5 → Specials
  ('ent_boss',   'geo_1'),
  ('ent_boss',   'nfl_1'),
  ('ent_boss',   'roman_1'),

  -- Specials → Grand
  ('geo_1',      'grand'),
  ('nfl_1',      'grand'),
  ('roman_1',    'grand');
