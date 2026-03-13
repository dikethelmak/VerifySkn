-- ============================================================
-- VerifySkn — Phase 3 Brand Partnership Portal
-- ============================================================

CREATE TABLE IF NOT EXISTS brand_submissions (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id                 uuid        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  product_name             text        NOT NULL,
  barcode                  text        NOT NULL,
  category                 text        NOT NULL,
  size_ml                  integer,
  authenticated_retailers  text[]      NOT NULL DEFAULT '{}',
  packaging_notes          text        NOT NULL DEFAULT '',
  status                   text        NOT NULL DEFAULT 'pending'
                                       CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes              text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_submissions_brand_id      ON brand_submissions (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_submissions_submitted_by  ON brand_submissions (submitted_by);
CREATE INDEX IF NOT EXISTS idx_brand_submissions_status        ON brand_submissions (status);

ALTER TABLE brand_submissions ENABLE ROW LEVEL SECURITY;

-- Brand reps can view and insert their own submissions
CREATE POLICY "brand_submissions_select_own"
  ON brand_submissions FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "brand_submissions_insert_own"
  ON brand_submissions FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- Admins can view and update all submissions
CREATE POLICY "brand_submissions_select_admin"
  ON brand_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "brand_submissions_update_admin"
  ON brand_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
