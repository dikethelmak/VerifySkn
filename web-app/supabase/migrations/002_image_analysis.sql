-- ============================================================
-- VerifySkn — Migration 002: Image Analysis & Combined Results
-- Run after 001_initial_schema.sql
-- ============================================================

-- ── image_analyses ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS image_analyses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_log_id      uuid        REFERENCES scan_logs (id) ON DELETE SET NULL,
  image_url        text,
  result           text        NOT NULL
                               CHECK (result IN ('authentic', 'suspicious', 'unverified')),
  confidence       integer     NOT NULL
                               CHECK (confidence BETWEEN 0 AND 100),
  flags            text[]      NOT NULL DEFAULT '{}',
  summary          text        NOT NULL DEFAULT '',
  font_quality     text        NOT NULL DEFAULT '',
  logo_accuracy    text        NOT NULL DEFAULT '',
  print_quality    text        NOT NULL DEFAULT '',
  label_alignment  text        NOT NULL DEFAULT '',
  spelling_check   text        NOT NULL DEFAULT '',
  hologram_check   text        NOT NULL DEFAULT '',
  analysed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_analyses_scan_log
  ON image_analyses (scan_log_id);

-- ── combined_results ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combined_results (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          text        NOT NULL,
  barcode_result      text        CHECK (barcode_result IN ('authentic', 'suspicious', 'unverified')),
  barcode_confidence  integer     CHECK (barcode_confidence BETWEEN 0 AND 100),
  image_result        text        CHECK (image_result IN ('authentic', 'suspicious', 'unverified')),
  image_confidence    integer     CHECK (image_confidence BETWEEN 0 AND 100),
  final_result        text        NOT NULL
                                  CHECK (final_result IN ('authentic', 'suspicious', 'unverified')),
  final_confidence    integer     NOT NULL
                                  CHECK (final_confidence BETWEEN 0 AND 100),
  product_id          uuid        REFERENCES products (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combined_results_session
  ON combined_results (session_id);
