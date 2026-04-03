import { createClient } from '@/lib/supabase/server'

const DEFAULT_MAX_DAILY = 500

// When Supabase is unavailable, fall back to a module-level in-memory counter.
// In serverless, warm instances share this state briefly — enough to prevent
// a complete fail-open during an outage window.
const EMERGENCY_LIMIT = 10
let emergencyCount = 0
let emergencyDate  = ''

export interface RateLimitResult {
  allowed: boolean
  count:   number
  limit:   number
}

export async function checkDailyVisionLimit(): Promise<RateLimitResult> {
  const parsed = parseInt(process.env.MAX_DAILY_VISION_CALLS ?? '', 10)
  const limit  = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_DAILY

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  try {
    const supabase = createClient()

    const { data, error } = await supabase.rpc('increment_vision_counter', {
      p_date: today,
    })

    if (error) {
      console.error('[vision-rate-limiter] Counter RPC failed, using emergency limit:', error)
      if (emergencyDate !== today) { emergencyCount = 0; emergencyDate = today }
      emergencyCount++
      return { allowed: emergencyCount <= EMERGENCY_LIMIT, count: emergencyCount, limit: EMERGENCY_LIMIT }
    }

    const count = data as number
    return { allowed: count <= limit, count, limit }
  } catch (err) {
    console.error('[vision-rate-limiter] Unexpected error, using emergency limit:', err)
    if (emergencyDate !== today) { emergencyCount = 0; emergencyDate = today }
    emergencyCount++
    return { allowed: emergencyCount <= EMERGENCY_LIMIT, count: emergencyCount, limit: EMERGENCY_LIMIT }
  }
}
