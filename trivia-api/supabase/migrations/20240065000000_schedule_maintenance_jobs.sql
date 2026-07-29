-- Schedule the two maintenance jobs in the database instead of in prose.
--
-- README.md has told the operator since the beginning to "use an external cron
-- service (e.g. cron-job.org, GitHub Actions, or Supabase's own pg_cron)" to
-- call generate-questions and snapshot-leaderboard-ranks. Nothing in the repo
-- did it, nothing failed when it was not done, and it was never done: the most
-- recent row in question_bank predates this migration by three months and came
-- from a seed migration, not a generation run. The bank has been static, and
-- rank-delta arrows have had no snapshots to compare against.
--
-- Putting the schedule in a migration makes it reviewable, versioned, and true
-- of every environment that runs migrations.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Both jobs authenticate with CRON_SECRET and need the project's function URL.
-- Neither belongs in a migration, so they are read from Vault at schedule time.
-- Create them once per project before this runs:
--
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'functions_base_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
--
-- If either is missing the migration still succeeds and says what to do, rather
-- than failing the deploy pipeline over configuration that is not in the repo.

CREATE OR REPLACE FUNCTION public.schedule_maintenance_jobs()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret   TEXT;
BEGIN
  SELECT decrypted_secret INTO v_base_url
  FROM vault.decrypted_secrets WHERE name = 'functions_base_url';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  IF v_base_url IS NULL OR v_secret IS NULL THEN
    RETURN 'skipped: create the functions_base_url and cron_secret vault secrets, then run select public.schedule_maintenance_jobs();';
  END IF;

  -- unschedule is not IF EXISTS, so tolerate a first run.
  BEGIN PERFORM cron.unschedule('question-bank-topup'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('leaderboard-rank-snapshot'); EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Top up the question bank nightly, before the US evening peak.
  PERFORM cron.schedule(
    'question-bank-topup',
    '0 9 * * *',
    format(
      $cmd$SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', %L),
        body    := '{"topUpAll": true}'::jsonb,
        timeout_milliseconds := 300000
      );$cmd$,
      v_base_url || '/generate-questions',
      'Bearer ' || v_secret
    )
  );

  -- Snapshot ranks daily so get-leaderboard can compute movement badges.
  -- Runs after the top-up window rather than alongside it.
  PERFORM cron.schedule(
    'leaderboard-rank-snapshot',
    '30 4 * * *',
    format(
      $cmd$SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', %L),
        body    := '{}'::jsonb,
        timeout_milliseconds := 120000
      );$cmd$,
      v_base_url || '/snapshot-leaderboard-ranks',
      'Bearer ' || v_secret
    )
  );

  RETURN 'scheduled: question-bank-topup (09:00 UTC), leaderboard-rank-snapshot (04:30 UTC)';
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_maintenance_jobs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.schedule_maintenance_jobs() FROM anon;
REVOKE ALL ON FUNCTION public.schedule_maintenance_jobs() FROM authenticated;

DO $$
DECLARE
  result TEXT;
BEGIN
  SELECT public.schedule_maintenance_jobs() INTO result;
  RAISE NOTICE 'schedule_maintenance_jobs: %', result;
END;
$$;
