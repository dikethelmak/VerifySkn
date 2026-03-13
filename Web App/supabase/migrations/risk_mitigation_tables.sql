-- ============================================================
-- VerifySkn — Risk mitigation tables & columns
-- Apply after all prior migrations (001–007)
-- ============================================================

-- ── image_analyses: new columns ──────────────────────────────
-- Risk 3 & 6: cache_key, session_id, provider
-- Risk 3:     packaging_checks JSONB for structured cache reads

ALTER TABLE image_analyses
  ADD COLUMN IF NOT EXISTS session_id        text,
  ADD COLUMN IF NOT EXISTS cache_key         text,
  ADD COLUMN IF NOT EXISTS provider          text,
  ADD COLUMN IF NOT EXISTS packaging_checks  jsonb;

CREATE INDEX IF NOT EXISTS idx_image_analyses_session_id
  ON image_analyses (session_id);

CREATE INDEX IF NOT EXISTS idx_image_analyses_cache_key
  ON image_analyses (cache_key, analysed_at DESC);

-- ── vision_daily_counters ─────────────────────────────────────
-- Risk 4: hard daily cap on vision API calls

CREATE TABLE IF NOT EXISTS vision_daily_counters (
  date    date    PRIMARY KEY,
  count   integer NOT NULL DEFAULT 0
);

-- Atomic increment — returns new count
CREATE OR REPLACE FUNCTION increment_vision_counter(p_date date)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO vision_daily_counters (date, count)
  VALUES (p_date, 1)
  ON CONFLICT (date) DO UPDATE
    SET count = vision_daily_counters.count + 1
  RETURNING count INTO new_count;

  RETURN new_count;
END;
$$;

-- ── scan_logs_archive ─────────────────────────────────────────
-- Risk 8 / cleanup: archive scan_logs older than 6 months

CREATE TABLE IF NOT EXISTS scan_logs_archive (
  LIKE scan_logs INCLUDING ALL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

-- ── scrape_jobs ───────────────────────────────────────────────
-- Fix 4: base table DDL was missing — routes write to this table

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id           text        PRIMARY KEY,
  job_type     text,
  status       text        NOT NULL DEFAULT 'running'
                           CHECK (status IN ('running', 'completed', 'failed')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata     jsonb       NOT NULL DEFAULT '{}'
);

-- ── scrape_job_checkpoints ────────────────────────────────────
-- Risk 8: resume scrape jobs from last completed brand

CREATE TABLE IF NOT EXISTS scrape_job_checkpoints (
  job_id           text        PRIMARY KEY,
  completed_brands text[]      NOT NULL DEFAULT '{}',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── scrape_jobs: new columns ──────────────────────────────────
-- Risk 8 & cleanup: job_type, metadata

ALTER TABLE scrape_jobs
  ADD COLUMN IF NOT EXISTS job_type    text,
  ADD COLUMN IF NOT EXISTS metadata    jsonb  NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status
  ON scrape_jobs (status);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_job_type
  ON scrape_jobs (job_type);

-- ── social_intelligence_cache ─────────────────────────────────
-- Referenced by cleanup route — create if not already present

CREATE TABLE IF NOT EXISTS social_intelligence_cache (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand            text        NOT NULL,
  platform         text        NOT NULL,
  post_url         text        NOT NULL,
  content          text        NOT NULL DEFAULT '',
  image_urls       text[]      NOT NULL DEFAULT '{}',
  engagement_score integer     NOT NULL DEFAULT 0,
  posted_at        timestamptz,
  processed        boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_cache_brand
  ON social_intelligence_cache (brand);

CREATE INDEX IF NOT EXISTS idx_social_cache_processed
  ON social_intelligence_cache (processed, created_at);
