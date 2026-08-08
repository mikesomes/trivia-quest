-- One conservative, observable AI candidate batch at a time. The Edge
-- Function owns generation and all review gates; this scheduler merely invokes
-- it daily with the existing CRON_SECRET stored in Vault.

CREATE TABLE IF NOT EXISTS public.question_candidate_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  targets JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  results JSONB NOT NULL DEFAULT '[]'::JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_question_candidate_pipeline_runs_started_at
  ON public.question_candidate_pipeline_runs (started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_running_question_candidate_pipeline
  ON public.question_candidate_pipeline_runs ((true))
  WHERE status = 'running';

CREATE OR REPLACE FUNCTION public.start_question_candidate_pipeline_run(p_targets JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID;
BEGIN
  -- A terminated Edge Function must not block tomorrow's scheduled run forever.
  UPDATE public.question_candidate_pipeline_runs
  SET status = 'failed',
      finished_at = now(),
      results = results || jsonb_build_array(jsonb_build_object('error', 'Run exceeded 45-minute safety window'))
  WHERE status = 'running'
    AND started_at < now() - interval '45 minutes';

  BEGIN
    INSERT INTO public.question_candidate_pipeline_runs (targets, status)
    VALUES (p_targets, 'running')
    RETURNING id INTO v_run_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN NULL;
  END;

  RETURN v_run_id;
END;
$$;

ALTER TABLE public.question_candidate_pipeline_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.question_candidate_pipeline_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_question_candidate_pipeline_run(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_question_candidate_pipeline_run(JSONB) TO service_role;

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

  BEGIN PERFORM cron.unschedule('question-bank-topup'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('question-candidate-pipeline'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('leaderboard-rank-snapshot'); EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule(
    'question-candidate-pipeline',
    '0 9 * * *',
    format(
      $cmd$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', %L),
        body := '{}'::jsonb,
        timeout_milliseconds := 600000
      );$cmd$,
      v_base_url || '/run-question-candidate-pipeline',
      'Bearer ' || v_secret
    )
  );

  PERFORM cron.schedule(
    'leaderboard-rank-snapshot',
    '30 4 * * *',
    format(
      $cmd$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', %L),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );$cmd$,
      v_base_url || '/snapshot-leaderboard-ranks',
      'Bearer ' || v_secret
    )
  );

  RETURN 'scheduled: question-candidate-pipeline (09:00 UTC daily), leaderboard-rank-snapshot (04:30 UTC daily)';
END;
$$;
