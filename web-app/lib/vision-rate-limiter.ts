import { createClient } from '@/lib/supabase/server'

const DEFAULT_MAX_DAILY = 500

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number
}

export async function checkDailyVisionLimit(): Promise<RateLimitResult> {
  // Fix 10: guard against NaN from a malformed env var
  const parsed = parseInt(process.env.MAX_DAILY_VISION_CALLS ?? '', 10)
  const limit  = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_DAILY

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('increment_vision_counter', {
      p_date: today,
    })

    if (error) {
      // Counter failure must never block users
      console.error('[vision-rate-limiter] Counter RPC failed (allowing request):', error)
      return { allowed: true, count: 0, limit }
    }

    const count = data as number
    return { allowed: count <= limit, count, limit }
  } catch (err) {
    console.error('[vision-rate-limiter] Unexpected error (allowing request):', err)
    return { allowed: true, count: 0, limit }
  }
}
