-- 009_api_counters.sql
-- Generic per-service, per-day call counter for rate-limiting external free-tier APIs.

CREATE TABLE IF NOT EXISTS api_call_counters (
  service TEXT    NOT NULL,
  date    DATE    NOT NULL DEFAULT CURRENT_DATE,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (service, date)
);

-- Atomically increment and return the new count.
CREATE OR REPLACE FUNCTION increment_api_counter(p_service TEXT, p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO api_call_counters (service, date, count)
  VALUES (p_service, p_date, 1)
  ON CONFLICT (service, date)
  DO UPDATE SET count = api_call_counters.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- Service role can call the function; anon cannot.
REVOKE ALL ON FUNCTION increment_api_counter(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_api_counter(TEXT, DATE) TO service_role;

-- Auto-purge rows older than 90 days (keep the table tiny).
CREATE OR REPLACE FUNCTION purge_old_api_counters()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM api_call_counters WHERE date < CURRENT_DATE - INTERVAL '90 days';
$$;
