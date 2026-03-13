-- ============================================================
-- VerifySkn — Phase 1 Schema
-- ============================================================

-- ── brands ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  verified   boolean     NOT NULL DEFAULT false,
  website    text,
  logo_url   text
);

-- ── products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode                  text          NOT NULL UNIQUE,
  name                     text          NOT NULL,
  brand                    text          NOT NULL,
  category                 text          NOT NULL,
  size_ml                  integer,
  country_of_manufacture   text          NOT NULL,
  authenticated_retailers  text[]        NOT NULL DEFAULT '{}',
  packaging_notes          text,
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON products (barcode);

-- auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── scan_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_scanned   text        NOT NULL,
  product_id        uuid        REFERENCES products (id) ON DELETE SET NULL,
  result            text        NOT NULL
                                CHECK (result IN ('authentic', 'suspicious', 'unverified')),
  confidence_score  integer     NOT NULL
                                CHECK (confidence_score BETWEEN 0 AND 100),
  user_agent        text,
  scanned_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_barcode
  ON scan_logs (barcode_scanned);

CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at
  ON scan_logs (scanned_at DESC);
