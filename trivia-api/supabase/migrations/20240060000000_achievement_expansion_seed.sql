-- Achievement expansion, content half — 12 -> 35 achievements. New families
-- use data that's genuinely server-tracked for every mode that awards it
-- (quest mode is deliberately excluded here: its progress is currently
-- client-side only and not server-verified, so it has no reliable data
-- source for achievement checks yet).
INSERT INTO public.achievements (id, name, description, icon, rarity) VALUES
  ('survival_10', 'Going the Distance',    'Answer 10 questions in a single Survival run', '🛡️', 'common'),
  ('survival_25', 'Endurance',             'Answer 25 questions in a single Survival run', '⛰️', 'rare'),
  ('survival_50', 'Iron Will',             'Answer 50 questions in a single Survival run', '🗿', 'epic'),

  ('blitz_15', 'Quick Draw',               'Answer 15 correct in a single Blitz round',    '🎯', 'common'),
  ('blitz_25', 'Lightning Round',          'Answer 25 correct in a single Blitz round',    '⚡', 'rare'),
  ('blitz_35', 'Blink and You Miss It',    'Answer 35 correct in a single Blitz round',    '🌩️', 'epic'),

  ('day_streak_7',   'Weekly Habit',       'Reach a 7-day streak',                         '🔥', 'common'),
  ('day_streak_30',  'Monthly Devotion',   'Reach a 30-day streak',                        '📅', 'rare'),
  ('day_streak_100', 'Centurion Streak',   'Reach a 100-day streak',                       '💯', 'legendary'),

  ('chest_streak_7',  'Treasure Hunter',   'Open the daily chest 7 days in a row',         '🗝️', 'common'),
  ('chest_streak_30', 'Vault Keeper',      'Open the daily chest 30 days in a row',        '🏦', 'epic'),

  ('category_master_general_knowledge', 'Know-It-All',    'Answer 50 General Knowledge questions correctly', '🧠', 'rare'),
  ('category_master_history',           'Historian',      'Answer 50 History questions correctly',           '📜', 'rare'),
  ('category_master_science',           'Scientist',      'Answer 50 Science questions correctly',           '🔬', 'rare'),
  ('category_master_sports',            'MVP',            'Answer 50 Sports questions correctly',            '⚽', 'rare'),
  ('category_master_movies_tv',         'Cinephile',      'Answer 50 Movies & TV questions correctly',       '🎬', 'rare'),
  ('category_master_geography',         'Globetrotter',   'Answer 50 Geography questions correctly',         '🌍', 'rare'),
  ('category_master_nfl_football',      'Gridiron Great', 'Answer 50 NFL Football questions correctly',      '🏈', 'rare'),
  ('category_master_roman_history',     'Senator',        'Answer 50 Roman History questions correctly',     '🏛️', 'rare'),
  ('category_master_harry_potter',      'Wizard',         'Answer 50 Harry Potter questions correctly',      '🪄', 'rare'),
  ('category_master_famous_quotes',     'Quotable',       'Answer 50 Famous Quotes questions correctly',     '💬', 'rare'),
  ('category_master_music',             'Music Buff',     'Answer 50 Music questions correctly',             '🎵', 'rare'),
  ('category_master_odd_one_out',       'Odd Spotter',    'Answer 50 Odd One Out questions correctly',       '🧩', 'rare');
