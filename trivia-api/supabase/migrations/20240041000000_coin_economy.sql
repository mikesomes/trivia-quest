-- Persistent coin balance and item inventory on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_lives INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_hammers INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_shields INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_xp_booster INTEGER NOT NULL DEFAULT 0;

-- Track whether a round has an active XP booster
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS xp_booster_active BOOLEAN NOT NULL DEFAULT FALSE;
