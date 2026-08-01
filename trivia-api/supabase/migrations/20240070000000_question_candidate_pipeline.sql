-- AI question candidates are deliberately isolated from the live question_bank.
-- Only promote_question_candidate may copy a reviewed candidate into gameplay.

CREATE OR REPLACE FUNCTION public.normalize_question_text(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(lower(p_value), '[^[:alnum:]_[:space:]]+', '', 'g'),
    '[[:space:]]+', ' ', 'g'
  ));
$$;

-- Supabase may install pgcrypto in an `extensions` schema rather than `public`.
-- Resolve its digest(bytea, text) function by catalog rather than assuming a
-- search path; this also supports older local projects that installed it in public.
CREATE OR REPLACE FUNCTION public.sha256_hex(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  digest_schema TEXT;
  result TEXT;
BEGIN
  SELECT namespace.nspname INTO digest_schema
  FROM pg_proc AS proc
  JOIN pg_namespace AS namespace ON namespace.oid = proc.pronamespace
  WHERE proc.proname = 'digest'
    AND proc.proargtypes = '17 25'::oidvector -- bytea, text
  ORDER BY namespace.nspname = 'extensions' DESC
  LIMIT 1;

  IF digest_schema IS NULL THEN
    RAISE EXCEPTION 'pgcrypto digest(bytea, text) is required for question candidate hashes';
  END IF;

  EXECUTE format(
    'SELECT encode(%I.digest(convert_to($1, ''UTF8''), ''sha256''::text), ''hex'')',
    digest_schema
  ) INTO result USING p_value;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.question_content_hash(p_question TEXT, p_answer TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.sha256_hex(
    regexp_replace(
      regexp_replace(lower(p_question || '|' || p_answer), '[^[:alnum:]_[:space:]|]+', '', 'g'),
      '[[:space:]]+', ' ', 'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_four_nonempty_distinct_strings(p_value JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT jsonb_typeof(p_value) = 'array'
    AND jsonb_array_length(p_value) = 4
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_value) AS item
      WHERE jsonb_typeof(item) <> 'string' OR btrim(item #>> '{}') = ''
    )
    AND (
      SELECT count(DISTINCT lower(btrim(item #>> '{}')))
      FROM jsonb_array_elements(p_value) AS item
    ) = 4;
$$;

CREATE TABLE public.question_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  difficulty TEXT NOT NULL,
  difficulty_rating INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::JSONB,
  generation_batch_id UUID,
  generator_model TEXT,
  generation_seed TEXT,
  blind_review_answer_index INTEGER,
  blind_review_matches BOOLEAN,
  editorial_status TEXT NOT NULL DEFAULT 'pending',
  reviewer_confidence NUMERIC,
  reviewer_notes TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verification_source TEXT,
  duplicate_score NUMERIC,
  normalized_question_hash TEXT GENERATED ALWAYS AS (
    public.sha256_hex(public.normalize_question_text(question_text))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT question_candidates_category_check CHECK (category IN (
    'general_knowledge', 'history', 'science', 'sports', 'movies_tv', 'geography',
    'nfl_football', 'roman_history', 'harry_potter', 'famous_quotes', 'music', 'odd_one_out'
  )),
  CONSTRAINT question_candidates_difficulty_check CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT question_candidates_difficulty_rating_check CHECK (difficulty_rating BETWEEN 1 AND 10),
  CONSTRAINT question_candidates_question_text_check CHECK (btrim(question_text) <> ''),
  CONSTRAINT question_candidates_choices_check CHECK (public.is_four_nonempty_distinct_strings(choices)),
  CONSTRAINT question_candidates_correct_answer_index_check CHECK (correct_answer_index BETWEEN 0 AND 3),
  CONSTRAINT question_candidates_correct_answer_check CHECK (btrim(correct_answer) <> ''),
  CONSTRAINT question_candidates_correct_answer_matches_choice_check CHECK (
    lower(btrim(correct_answer)) = lower(btrim(choices ->> correct_answer_index))
  ),
  CONSTRAINT question_candidates_tags_check CHECK (jsonb_typeof(tags) = 'array'),
  CONSTRAINT question_candidates_blind_review_index_check CHECK (
    blind_review_answer_index IS NULL OR blind_review_answer_index BETWEEN 0 AND 3
  ),
  CONSTRAINT question_candidates_editorial_status_check CHECK (
    editorial_status IN ('pending', 'approved', 'revise', 'rejected')
  ),
  CONSTRAINT question_candidates_reviewer_confidence_check CHECK (
    reviewer_confidence IS NULL OR reviewer_confidence BETWEEN 0 AND 1
  ),
  CONSTRAINT question_candidates_verification_status_check CHECK (
    verification_status IN ('unverified', 'verified', 'failed')
  )
);

CREATE INDEX idx_question_candidates_category_difficulty
  ON public.question_candidates (category, difficulty);
CREATE INDEX idx_question_candidates_editorial_status
  ON public.question_candidates (editorial_status);
CREATE INDEX idx_question_candidates_verification_status
  ON public.question_candidates (verification_status);
CREATE INDEX idx_question_candidates_generation_batch_id
  ON public.question_candidates (generation_batch_id)
  WHERE generation_batch_id IS NOT NULL;
CREATE INDEX idx_question_candidates_normalized_question_hash
  ON public.question_candidates (normalized_question_hash);

-- question_bank is the established production table. Keep its option-column
-- shape for compatibility with every gameplay RPC, and add provenance/metadata.
ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_rating INTEGER,
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS source_candidate_id UUID REFERENCES public.question_candidates(id) ON DELETE RESTRICT;

ALTER TABLE public.question_bank
  ADD CONSTRAINT question_bank_difficulty_rating_check
    CHECK (difficulty_rating IS NULL OR difficulty_rating BETWEEN 1 AND 10),
  ADD CONSTRAINT question_bank_tags_check CHECK (jsonb_typeof(tags) = 'array');

CREATE UNIQUE INDEX idx_question_bank_source_candidate_id
  ON public.question_bank (source_candidate_id)
  WHERE source_candidate_id IS NOT NULL;

-- The function is a single PostgreSQL transaction. It locks the candidate and
-- the provenance unique index prevents two concurrent calls promoting it twice.
CREATE OR REPLACE FUNCTION public.promote_question_candidate(
  p_candidate_id UUID,
  p_allow_unverified BOOLEAN DEFAULT false
)
RETURNS public.question_bank
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate public.question_candidates%ROWTYPE;
  promoted public.question_bank%ROWTYPE;
  candidate_hash TEXT;
BEGIN
  SELECT * INTO candidate
  FROM public.question_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question candidate % does not exist', p_candidate_id;
  END IF;
  IF candidate.editorial_status <> 'approved' THEN
    RAISE EXCEPTION 'Candidate % cannot be promoted: editorial_status must be approved', p_candidate_id;
  END IF;
  IF candidate.blind_review_answer_index IS NOT NULL AND candidate.blind_review_matches IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Candidate % cannot be promoted: blind review did not match', p_candidate_id;
  END IF;
  IF NOT p_allow_unverified AND candidate.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'Candidate % cannot be promoted: verification_status must be verified', p_candidate_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.question_bank WHERE source_candidate_id = p_candidate_id) THEN
    RAISE EXCEPTION 'Candidate % has already been promoted', p_candidate_id;
  END IF;

  candidate_hash := public.question_content_hash(candidate.question_text, candidate.correct_answer);
  IF EXISTS (SELECT 1 FROM public.question_bank WHERE content_hash = candidate_hash) THEN
    RAISE EXCEPTION 'Candidate % duplicates an existing live question', p_candidate_id;
  END IF;

  INSERT INTO public.question_bank (
    category, subcategory, difficulty, difficulty_rating, question_text,
    option_a, option_b, option_c, option_d, correct_option, explanation,
    tags, content_hash, source, source_candidate_id
  ) VALUES (
    candidate.category, candidate.subcategory, candidate.difficulty, candidate.difficulty_rating, candidate.question_text,
    candidate.choices ->> 0, candidate.choices ->> 1, candidate.choices ->> 2, candidate.choices ->> 3,
    chr(ascii('a') + candidate.correct_answer_index), candidate.explanation,
    candidate.tags, candidate_hash, COALESCE(candidate.generator_model, 'ai-candidate'), candidate.id
  ) RETURNING * INTO promoted;

  RETURN promoted;
END;
$$;

ALTER TABLE public.question_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.question_candidates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_question_candidate(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_question_candidate(UUID, BOOLEAN) TO service_role;

-- The prior nightly job targeted a live-bank inventory and would now create an
-- unbounded staging backlog. Automated batch processing returns in a later
-- phase with coverage planning and review capacity awareness.
DO $$
BEGIN
  PERFORM cron.unschedule('question-bank-topup');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
