-- ============================================================
-- QUEST MAP SEED — 18 nodes across 5 branches + special nodes
-- Grid: x=column (0-4), y=row (0=top, higher=deeper in map)
-- ============================================================

INSERT INTO public.quest_nodes
  (id, title, description, category, difficulty, game_mode, branch, position_x, position_y, xp_reward, pass_threshold, star_2_threshold, star_3_threshold, unlock_level)
VALUES
  -- BRANCH: General Knowledge (x=0)
  ('gk_1',       'Knowledge Spark',    'Where every quest begins.',          'general_knowledge', 'easy',   'classic',     'general',       0, 0, 150, 0.6, 0.8, 1.0, 1),
  ('gk_2',       'Quick Fire',         'Answer fast — every second counts.', 'general_knowledge', 'medium', 'classic',     'general',       0, 2, 250, 0.6, 0.8, 1.0, 1),
  ('gk_3',       'Deep Cut',           'Only the sharp survive.',            'general_knowledge', 'hard',   'classic',     'general',       0, 4, 400, 0.6, 0.8, 1.0, 1),

  -- BRANCH: History (x=1)
  ('hist_1',     'First Chronicle',    'The story of humanity begins.',      'history',           'easy',   'classic',     'history',       1, 0, 150, 0.6, 0.8, 1.0, 1),
  ('hist_2',     'Ages of Empires',    'Rise and fall of great nations.',    'history',           'medium', 'classic',     'history',       1, 2, 250, 0.6, 0.8, 1.0, 1),
  ('hist_3',     'Lost to Time',       'Forgotten facts resurface.',         'history',           'hard',   'survival',    'history',       1, 4, 400, 0.6, 0.8, 1.0, 1),

  -- BRANCH: Science (x=2)
  ('sci_1',      'Lab Notes',          'Curiosity is your only tool.',       'science',           'easy',   'classic',     'science',       2, 0, 150, 0.6, 0.8, 1.0, 1),
  ('sci_2',      'Hypothesis',         'Form your theory. Test it.',         'science',           'medium', 'classic',     'science',       2, 2, 250, 0.6, 0.8, 1.0, 1),
  ('sci_3',      'Peer Review',        'Your answers face scrutiny.',        'science',           'hard',   'boss_battle', 'science',       2, 4, 500, 0.8, 0.9, 1.0, 1),

  -- BRANCH: Sports (x=3)
  ('sports_1',   'Opening Whistle',    'Step onto the field.',               'sports',            'easy',   'classic',     'sports',        3, 0, 150, 0.6, 0.8, 1.0, 1),
  ('sports_2',   'Halftime Drill',     'Push through to the second half.',   'sports',            'medium', 'classic',     'sports',        3, 2, 250, 0.6, 0.8, 1.0, 1),
  ('sports_3',   'Championship',       'Only legends make it here.',         'sports',            'hard',   'classic',     'sports',        3, 4, 400, 0.6, 0.8, 1.0, 1),

  -- BRANCH: Movies & TV (x=4)
  ('ent_1',      'Opening Credits',    'Lights, camera, trivia.',            'movies_tv',         'easy',   'classic',     'entertainment', 4, 0, 150, 0.6, 0.8, 1.0, 1),
  ('ent_2',      'Plot Twist',         'Nothing is as it seems.',            'movies_tv',         'medium', 'classic',     'entertainment', 4, 2, 250, 0.6, 0.8, 1.0, 1),
  ('ent_3',      'Director''s Cut',    'The version only true fans know.',   'movies_tv',         'hard',   'classic',     'entertainment', 4, 4, 400, 0.6, 0.8, 1.0, 1),

  -- SPECIAL NODES (cross-links)
  ('geo_1',      'World Tour',         'Geography unlocked from within.',    'geography',         'medium', 'classic',     'special',       1.5, 3, 350, 0.6, 0.8, 1.0, 3),
  ('nfl_1',      'Fourth & Goal',      'Elite NFL knowledge required.',      'nfl_football',      'hard',   'boss_battle', 'special',       3.5, 5, 600, 0.8, 0.9, 1.0, 5),
  ('roman_1',    'Ave Caesar',         'Prove your mastery of Rome.',        'roman_history',     'hard',   'boss_battle', 'special',       1.5, 5, 600, 0.8, 0.9, 1.0, 5),

  -- GRAND CHALLENGE
  ('grand',      'Trivia Gauntlet',    'The ultimate test of all knowledge.','general_knowledge', 'boss',   'boss_battle', 'special',       2,   7, 1500, 0.8, 0.9, 1.0, 8);

-- ============================================================
-- CONNECTIONS (from → to)
-- ============================================================
INSERT INTO public.quest_node_connections (from_node_id, to_node_id) VALUES
  -- General Knowledge branch
  ('gk_1',    'gk_2'),
  ('gk_2',    'gk_3'),

  -- History branch
  ('hist_1',  'hist_2'),
  ('hist_2',  'hist_3'),

  -- Science branch
  ('sci_1',   'sci_2'),
  ('sci_2',   'sci_3'),

  -- Sports branch
  ('sports_1','sports_2'),
  ('sports_2','sports_3'),

  -- Entertainment branch
  ('ent_1',   'ent_2'),
  ('ent_2',   'ent_3'),

  -- Cross-links to special nodes
  ('gk_2',    'geo_1'),
  ('sci_2',   'geo_1'),
  ('sports_3','nfl_1'),
  ('hist_3',  'roman_1'),

  -- Grand challenge unlocks
  ('gk_3',    'grand'),
  ('hist_3',  'grand'),
  ('sci_3',   'grand'),
  ('sports_3','grand'),
  ('ent_3',   'grand');
