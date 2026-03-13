-- ============================================================
-- VerifySkn — Phase 3 Notifications
-- ============================================================

-- ── Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (
    type IN ('report_update', 'upvote', 'product_verified', 'submission_approved', 'admin_alert')
  ),
  title      text        NOT NULL,
  message    text        NOT NULL,
  read       boolean     NOT NULL DEFAULT false,
  link       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications (user_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Realtime ─────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ── Trigger 1: Report status change → notify reporter ────────

CREATE OR REPLACE FUNCTION notify_reporter_on_report_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
BEGIN
  -- Only proceed when status actually changes and there is a reporter
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.reporter_id IS NULL THEN RETURN NEW; END IF;

  v_label := CASE NEW.status
    WHEN 'reviewed'  THEN 'reviewed by our team'
    WHEN 'confirmed' THEN 'confirmed — the product has been flagged as counterfeit'
    WHEN 'dismissed' THEN 'dismissed after review'
    ELSE NEW.status
  END;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.reporter_id,
    'report_update',
    'Report Status Updated',
    'Your report for barcode ' || NEW.barcode || ' has been ' || v_label || '.',
    '/result/' || NEW.barcode
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reporter_on_report_update ON public.reports;
CREATE TRIGGER trg_notify_reporter_on_report_update
  AFTER UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_reporter_on_report_update();

-- ── Trigger 2: Report upvoted → notify reporter ──────────────

CREATE OR REPLACE FUNCTION notify_reporter_on_upvote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id uuid;
  v_barcode     text;
BEGIN
  SELECT reporter_id, barcode
    INTO v_reporter_id, v_barcode
    FROM public.reports
   WHERE id = NEW.report_id;

  -- Skip if anonymous report or self-upvote
  IF v_reporter_id IS NULL THEN RETURN NEW; END IF;
  IF v_reporter_id = NEW.user_id THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_reporter_id,
    'upvote',
    'Report Upvoted',
    'Someone upvoted your counterfeit report for barcode ' || v_barcode || '. Others are seeing the same issue.',
    '/result/' || v_barcode
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reporter_on_upvote ON public.report_upvotes;
CREATE TRIGGER trg_notify_reporter_on_upvote
  AFTER INSERT ON public.report_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_reporter_on_upvote();

-- ── Trigger 3: Submission approved → notify brand rep ────────

CREATE OR REPLACE FUNCTION notify_brand_rep_on_submission_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.submitted_by,
    'submission_approved',
    'Product Submission Approved',
    NEW.product_name || ' has been approved and added to the verified database.',
    '/brand'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_brand_rep_on_submission_approved ON public.brand_submissions;
CREATE TRIGGER trg_notify_brand_rep_on_submission_approved
  AFTER UPDATE ON public.brand_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_brand_rep_on_submission_approved();

-- ── Trigger 4: Confirmed counterfeit → notify users who scanned it ──

CREATE OR REPLACE FUNCTION notify_scanned_users_on_confirmed_counterfeit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'confirmed' THEN RETURN NEW; END IF;

  -- Notify every distinct user who scanned this barcode,
  -- excluding the reporter (they already get a report_update notification).
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT DISTINCT
    sl.user_id,
    'product_verified',
    'Counterfeit Alert',
    'A product you scanned (barcode ' || NEW.barcode || ') was confirmed counterfeit. Tap to see details.',
    '/result/' || NEW.barcode
  FROM public.scan_logs sl
  WHERE sl.barcode_scanned = NEW.barcode
    AND sl.user_id IS NOT NULL
    AND (NEW.reporter_id IS NULL OR sl.user_id <> NEW.reporter_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_scanned_users_on_confirmed_counterfeit ON public.reports;
CREATE TRIGGER trg_notify_scanned_users_on_confirmed_counterfeit
  AFTER UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_scanned_users_on_confirmed_counterfeit();
