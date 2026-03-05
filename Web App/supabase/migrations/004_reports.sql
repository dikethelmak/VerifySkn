-- ============================================================
-- VerifySkn — Phase 3 Reporting Schema
-- ============================================================

-- ── reports ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  barcode           text        NOT NULL,
  product_id        uuid        REFERENCES products(id) ON DELETE SET NULL,
  report_type       text        NOT NULL
                                CHECK (report_type IN ('counterfeit', 'mislabelled', 'wrong_info', 'other')),
  purchase_location text        NOT NULL,
  purchase_country  text        NOT NULL,
  description       text        NOT NULL,
  image_urls        text[]      NOT NULL DEFAULT '{}',
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'reviewed', 'confirmed', 'dismissed')),
  admin_notes       text,
  upvotes           integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_barcode     ON reports (barcode);
CREATE INDEX IF NOT EXISTS idx_reports_product_id  ON reports (product_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports (status);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_public"
  ON reports FOR SELECT
  USING (status != 'dismissed');

CREATE POLICY "reports_insert_auth"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "reports_update_own"
  ON reports FOR UPDATE
  USING (reporter_id = auth.uid() AND status = 'pending');

-- ── report_upvotes ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS report_upvotes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);

ALTER TABLE report_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upvotes_select_public" ON report_upvotes FOR SELECT USING (true);
CREATE POLICY "upvotes_insert_auth"   ON report_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upvotes_delete_own"    ON report_upvotes FOR DELETE USING (auth.uid() = user_id);

-- ── Triggers to keep reports.upvotes in sync ─────────────────

CREATE OR REPLACE FUNCTION handle_upvote_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE reports SET upvotes = upvotes + 1 WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_upvote_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE reports SET upvotes = upvotes - 1 WHERE id = OLD.report_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_upvote_insert ON report_upvotes;
CREATE TRIGGER on_upvote_insert
  AFTER INSERT ON report_upvotes
  FOR EACH ROW EXECUTE FUNCTION handle_upvote_insert();

DROP TRIGGER IF EXISTS on_upvote_delete ON report_upvotes;
CREATE TRIGGER on_upvote_delete
  AFTER DELETE ON report_upvotes
  FOR EACH ROW EXECUTE FUNCTION handle_upvote_delete();
