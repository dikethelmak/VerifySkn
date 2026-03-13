-- ============================================================
-- VerifySkn — Job failure webhook alert
-- Requires: pg_net extension, app.alert_webhook_url config var
-- ============================================================

-- Enable pg_net for HTTP calls from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Alert function ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_job_failure()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  webhook_url text;
  payload     jsonb;
BEGIN
  -- Only fire on failed status
  IF NEW.status <> 'failed' THEN
    RETURN NEW;
  END IF;

  -- Read webhook URL from Postgres config (set via: ALTER DATABASE ... SET app.alert_webhook_url = '...')
  BEGIN
    webhook_url := current_setting('app.alert_webhook_url');
  EXCEPTION WHEN OTHERS THEN
    -- Config var not set — silently skip
    RETURN NEW;
  END;

  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'job_id',     NEW.id,
    'job_type',   NEW.job_type,
    'started_at', NEW.started_at,
    'error',      NEW.metadata -> 'error'
  );

  -- Fire-and-forget HTTP POST via pg_net
  PERFORM net.http_post(
    url     := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := payload::text
  );

  RETURN NEW;
END;
$$;

-- ── Trigger ───────────────────────────────────────────────────

DROP TRIGGER IF EXISTS scrape_job_failure_alert ON scrape_jobs;

-- Fix 13: WHEN clause ensures the trigger only fires on the TRANSITION to 'failed',
-- not on every subsequent update to an already-failed row.
CREATE TRIGGER scrape_job_failure_alert
  AFTER INSERT OR UPDATE ON scrape_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'failed' AND (OLD.status IS DISTINCT FROM 'failed'))
  EXECUTE FUNCTION notify_job_failure();
