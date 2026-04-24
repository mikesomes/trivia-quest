INSERT INTO public.achievements (id, name, description, icon, rarity) VALUES
  -- Common
  ('first_game',     'First Steps',    'Play your first game',                        '🎮', 'common'),
  ('streak_5',       'On Fire',        'Get a 5-answer streak in a single round',     '🔥', 'common'),
  ('high_scorer',    'High XP',        'Earn 500 XP in a single round',               '⭐', 'common'),

  -- Rare
  ('games_10',       'Regular',        'Play 10 games',                               '🎯', 'rare'),
  ('perfect_round',  'Perfect Round',  'Answer all 10 questions correctly',           '💯', 'rare'),
  ('survivor',       'Survivor',       'Complete a round with exactly 1 life left',   '🫀', 'rare'),
  ('streak_10',      'Unstoppable',    'Get a 10-answer streak in a single round',    '💥', 'rare'),

  -- Epic
  ('games_50',       'Dedicated',      'Play 50 games',                               '💪', 'epic'),
  ('speed_demon',    'Speed Demon',    'Perfect round averaging under 8s per answer', '⚡', 'epic'),
  ('big_brain',      'Big Brain',      'Earn 1,500 XP in a session',                  '🧠', 'epic'),

  -- Legendary
  ('games_100',      'Century',        'Play 100 games',                              '🏆', 'legendary'),
  ('streak_15',      'Legendary',      'Get a 15-answer streak in a single round',    '👑', 'legendary');
