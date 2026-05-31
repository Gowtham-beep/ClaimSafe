-- Initial database schema migration for ClaimSafe

-- Sessions (anonymous users)
CREATE TABLE IF NOT EXISTS sessions (
  session_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ DEFAULT now() + INTERVAL '48 hours'
);

-- Policies (one session can have multiple policies)
CREATE TABLE IF NOT EXISTS policies (
  policy_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(session_id),
  user_id       UUID NULL,  -- nullable: attach to real user when auth added
  insurer       TEXT,
  policy_type   TEXT CHECK (policy_type IN ('health', 'term_life', 'vehicle')),
  sum_insured   TEXT,
  premium       TEXT,
  policy_period TEXT,
  renewal_date  TEXT,
  raw_pdf_path  TEXT,  -- GCP Cloud Storage path
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Pipeline job state machine
CREATE TABLE IF NOT EXISTS pipeline_jobs (
  job_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           UUID REFERENCES policies(policy_id),
  status              TEXT CHECK (status IN (
                        'uploaded', 'extracting', 'pass0_complete',
                        'pass1_complete', 'pass2_complete', 'done', 'failed'
                      )),
  chunking_strategy   TEXT CHECK (chunking_strategy IN ('section_aware', 'overlapping_window')),
  pass0_at            TIMESTAMPTZ,
  pass1_at            TIMESTAMPTZ,
  pass2_at            TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  error               TEXT,
  retry_count         INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Raw extracted clauses from Pass 1
CREATE TABLE IF NOT EXISTS extractions (
  extraction_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       UUID REFERENCES policies(policy_id),
  clause_type     TEXT CHECK (clause_type IN (
                    'exclusion', 'waiting_period', 'sublimit', 'copayment', 'coverage'
                  )),
  raw_text        TEXT,
  page_number     INTEGER,
  section_ref     TEXT
);

-- Final analysis output from Pass 2
CREATE TABLE IF NOT EXISTS analysis_results (
  result_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id         UUID REFERENCES policies(policy_id),
  risk_flags        JSONB,
  exclusions        JSONB,
  waiting_periods   JSONB,
  sublimits         JSONB,
  copayments        JSONB,
  coverage_summary  TEXT,
  claim_tips        JSONB,
  created_at        TIMESTAMPTZ DEFAULT now()
);
