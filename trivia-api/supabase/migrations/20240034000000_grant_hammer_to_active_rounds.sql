-- Give currently active pre-change rounds the same one-hammer start as new rounds.
UPDATE rounds
SET hammers = 1
WHERE status = 'active'
  AND hammers = 0;
