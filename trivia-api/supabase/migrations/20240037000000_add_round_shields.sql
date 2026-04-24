-- Add per-round shields to support level-based quest shield perks.
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS shields INTEGER NOT NULL DEFAULT 0;

ALTER TABLE rounds
  DROP CONSTRAINT IF EXISTS valid_shields,
  ADD CONSTRAINT valid_shields CHECK (shields >= 0);
