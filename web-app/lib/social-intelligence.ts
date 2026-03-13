// Social intelligence query helpers.
// Used by the image analysis route to inject crowdsourced fake patterns
// into the vision prompt and to modulate the confidence score.

import { createClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────

export interface FakeVisualPattern {
  marker_type: string
  description: string
  occurrence_count: number
  ai_confidence: number
}

export interface SocialSignal {
  brand: string
  fake_reports_7d:  number
  fake_reports_30d: number
  fake_reports_90d: number
  total_reports:    number
  trending:         boolean
  known_fake_patterns: FakeVisualPattern[]
}

// ── Query ─────────────────────────────────────────────────────

/**
 * Returns the combined social signal for a brand (merging product-level
 * and brand-level rows).  Returns null when no data exists yet.
 */
export async function getSocialIntelligence(
  brand: string,
  productId?: string | null
): Promise<SocialSignal | null> {
  const supabase = createClient()

  // Fetch product-specific row (if productId given) and brand-level row in parallel
  const [productRes, brandRes] = await Promise.all([
    productId
      ? supabase
          .from('social_signal_summary')
          .select('*')
          .eq('brand', brand)
          .eq('product_id', productId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('social_signal_summary')
      .select('*')
      .eq('brand', brand)
      .is('product_id', null)
      .maybeSingle(),
  ])

  const productRow = productRes.data
  const brandRow   = brandRes.data

  // If neither exists, nothing to report yet
  if (!productRow && !brandRow) return null

  // Take the higher count from each window (conservative: report the worse signal)
  const fake_reports_7d  = Math.max(productRow?.fake_reports_7d  ?? 0, brandRow?.fake_reports_7d  ?? 0)
  const fake_reports_30d = Math.max(productRow?.fake_reports_30d ?? 0, brandRow?.fake_reports_30d ?? 0)
  const fake_reports_90d = Math.max(productRow?.fake_reports_90d ?? 0, brandRow?.fake_reports_90d ?? 0)
  const total_reports    = Math.max(productRow?.total_reports    ?? 0, brandRow?.total_reports    ?? 0)
  const trending         = productRow?.trending || brandRow?.trending || false

  // Fetch top visual patterns for this brand
  const { data: patterns } = await supabase
    .from('fake_visual_patterns')
    .select('marker_type, description, occurrence_count, ai_confidence')
    .eq('brand', brand)
    .gte('ai_confidence', 55)
    .order('occurrence_count', { ascending: false })
    .limit(8)

  return {
    brand,
    fake_reports_7d,
    fake_reports_30d,
    fake_reports_90d,
    total_reports,
    trending,
    known_fake_patterns: (patterns ?? []) as FakeVisualPattern[],
  }
}

// ── Prompt injection ──────────────────────────────────────────

/**
 * Formats known fake patterns for injection into the Gemini/Groq vision prompt.
 * Returns an empty string if there are no patterns worth surfacing.
 */
export function formatPatternsForPrompt(signal: SocialSignal): string {
  const patterns = signal.known_fake_patterns.filter((p) => p.ai_confidence >= 60)
  if (patterns.length === 0) return ''

  const lines = patterns.map(
    (p) => `- ${p.marker_type.toUpperCase()}: ${p.description} (reported ${p.occurrence_count}x)`
  )

  return (
    `\n\nKNOWN FAKE TELLS FOR ${signal.brand.toUpperCase()} (crowdsourced from community reports):\n` +
    lines.join('\n') +
    '\nPay special attention to these specific patterns when analysing this product.'
  )
}

// ── Scoring modifier ──────────────────────────────────────────

export interface SocialModifierResult {
  adjustedConfidence: number
  socialFlag: string | null
}

/**
 * Applies a confidence penalty based on the volume of fake reports in the
 * last 30 days.  Caps adjustment at -15 so social signals cannot flip a
 * verdict on their own — they only modulate certainty.
 */
export function applySocialModifier(
  confidence: number,
  signal: SocialSignal | null
): SocialModifierResult {
  if (!signal) return { adjustedConfidence: confidence, socialFlag: null }

  const r = signal.fake_reports_30d

  if (r >= 20) {
    return {
      adjustedConfidence: Math.max(0, confidence - 15),
      socialFlag: `High fake report volume on social media (${r} reports in 30 days)`,
    }
  }
  if (r >= 5) {
    return {
      adjustedConfidence: Math.max(0, confidence - 7),
      socialFlag: `Some fake reports circulating online (${r} in 30 days)`,
    }
  }
  if (r >= 1) {
    return {
      adjustedConfidence: Math.max(0, confidence - 3),
      socialFlag: `${r} fake report${r > 1 ? 's' : ''} found for this brand`,
    }
  }

  return { adjustedConfidence: confidence, socialFlag: null }
}
