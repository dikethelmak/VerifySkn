-- ============================================================
-- VerifySkn — Phase 3 Admin Functions
-- ============================================================

-- Secure user listing for the admin panel.
-- Joins profiles with auth.users (which requires elevated privileges)
-- and counts reports per user. Admin role is verified inside the function.
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id                uuid,
  full_name         text,
  role              text,
  verified_brand_id uuid,
  scan_count        integer,
  created_at        timestamptz,
  email             text,
  report_count      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins may call this function
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.role::text,
      p.verified_brand_id,
      p.scan_count,
      p.created_at,
      u.email::text,
      COUNT(r.id)::bigint AS report_count
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN reports r ON r.reporter_id = p.id
    GROUP BY
      p.id, p.full_name, p.role, p.verified_brand_id,
      p.scan_count, p.created_at, u.email
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute to authenticated users
-- (function enforces admin role internally via auth.uid())
GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;
