-- "One more round" momentum: starting a new round within a short window of
-- finishing the previous one grants a bonus on the new round's XP. Eligibility
-- is decided once at create-round time using the server clock against the
-- prior round's completed_at, so it can never be spoofed by the client.
ALTER TABLE public.rounds
  ADD COLUMN momentum_bonus_active BOOLEAN NOT NULL DEFAULT false;
