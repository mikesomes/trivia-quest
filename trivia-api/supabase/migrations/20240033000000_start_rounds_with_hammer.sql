-- New rounds should default to one hammer, even when created outside edge functions.
ALTER TABLE rounds ALTER COLUMN hammers SET DEFAULT 1;
