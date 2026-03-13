// Generic daily rate limiter for external free-tier APIs.
// Uses api_call_counters in Supabase for atomic, serverless-safe counting.
// Fails open — a counter failure never blocks a user scan.

import { createClient } from '@/lib/supabase/server'

export async function checkApiLimit(
  service: string,
  maxPerDay: number
): Promise<boolean> {
  try {
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const { data, error } = await supabase.rpc('increment_api_counter', {
      p_service: service,
      p_date:    today,
    })

    if (error) {
      console.error(`[api-rate-limiter] Counter RPC failed for ${service} (allowing):`, error)
      return true // fail open
    }

    const count = data as number
    if (count > maxPerDay) {
      console.warn(`[api-rate-limiter] ${service} daily cap reached (${count}/${maxPerDay})`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[api-rate-limiter] Unexpected error for ${service} (allowing):`, err)
    return true // fail open
  }
}
