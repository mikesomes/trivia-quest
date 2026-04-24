-- Increase max lives from 3 to 5 to support the 5-streak extra-life reward
ALTER TABLE rounds DROP CONSTRAINT valid_lives;
ALTER TABLE rounds ADD CONSTRAINT valid_lives CHECK (lives_remaining BETWEEN 0 AND 5);
