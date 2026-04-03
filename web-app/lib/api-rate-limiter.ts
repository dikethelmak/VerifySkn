// Generic daily rate limiter for external free-tier APIs.
// Uses api_call_counters in Supabase for atomic, serverless-safe counting.
// Falls back to a module-level in-memory counter when Supabase is unavailable
// rather than failing completely open.

import { createClient } from '@/lib/supabase/server'

// Emergency in-memory fallback: per-service, per-day counters
// for use only when the Supabase RPC is unavailable.
const EMERGENCY_LIMIT = 5
const emergencyCounters: Record<string, { count: number; date: string }> = {}

function emergencyCheck(service: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  const entry = emergencyCounters[service]
  if (!entry || entry.date !== today) {
    emergencyCounters[service] = { count: 1, date: today }
    return true
  }
  entry.count++
  return entry.count <= EMERGENCY_LIMIT
}

export async function checkApiLimit(
  service:    string,
  maxPerDay:  number
): Promise<boolean> {
  try {
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase.rpc('increment_api_counter', {
      p_service: service,
      p_date:    today,
    })

    if (error) {
      console.error(`[api-rate-limiter] RPC failed for ${service}, using emergency limit:`, error)
      return emergencyCheck(service)
    }

    const count = data as number
    if (count > maxPerDay) {
      console.warn(`[api-rate-limiter] ${service} daily cap reached (${count}/${maxPerDay})`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[api-rate-limiter] Unexpected error for ${service}, using emergency limit:`, err)
    return emergencyCheck(service)
  }
}
