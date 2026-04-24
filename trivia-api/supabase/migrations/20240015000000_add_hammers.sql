-- Add hammers column to rounds. Earned when a 5-streak life bonus triggers at max lives.
ALTER TABLE rounds ADD COLUMN hammers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rounds ADD CONSTRAINT valid_hammers CHECK (hammers >= 0);
