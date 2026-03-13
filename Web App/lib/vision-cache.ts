import { createClient } from '@/lib/supabase/server'

export interface CachedAnalysis {
  result: 'authentic' | 'suspicious' | 'unverified'
  confidence: number
  flags: string[]
  summary: string
  packaging_checks: {
    font_quality: string
    logo_accuracy: string
    print_quality: string
    label_alignment: string
    spelling: string
    hologram: string
  }
  provider: string
}

const CACHE_TTL_DAYS = 7

function buildCacheKey(barcode?: string, brand?: string): string | null {
  if (!barcode && !brand) return null
  const b  = (barcode ?? '').toLowerCase().replace(/\s/g, '')
  const br = (brand   ?? '').toLowerCase().replace(/\s/g, '')
  return `${b}|${br}`
}

export async function getCachedAnalysis(
  barcode?: string,
  brand?: string
): Promise<CachedAnalysis | null> {
  const key = buildCacheKey(barcode, brand)
  if (!key) return null

  try {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // Fix 9: maybeSingle() returns null instead of throwing a 406 when no row found
    const { data } = await supabase
      .from('image_analyses')
      .select('result, confidence, flags, summary, packaging_checks, provider')
      .eq('cache_key', key)
      .gte('analysed_at', cutoff)
      .order('analysed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return null

    const pc = (data.packaging_checks as Record<string, string>) ?? {}

    return {
      result:     data.result as CachedAnalysis['result'],
      confidence: data.confidence,
      flags:      data.flags ?? [],
      summary:    data.summary ?? '',
      packaging_checks: {
        font_quality:    pc.font_quality    ?? 'uncertain',
        logo_accuracy:   pc.logo_accuracy   ?? 'uncertain',
        print_quality:   pc.print_quality   ?? 'uncertain',
        label_alignment: pc.label_alignment ?? 'uncertain',
        spelling:        pc.spelling        ?? 'uncertain',
        hologram:        pc.hologram        ?? 'not_applicable',
      },
      provider: data.provider ?? 'cache',
    }
  } catch {
    return null
  }
}

export async function saveAnalysisToCache(
  analysis: CachedAnalysis,
  sessionId: string,
  barcode?: string,
  brand?: string
): Promise<void> {
  const key = buildCacheKey(barcode, brand)

  try {
    const supabase = createClient()

    await supabase.from('image_analyses').insert({
      session_id:       sessionId,
      cache_key:        key,
      provider:         analysis.provider,
      result:           analysis.result,
      confidence:       analysis.confidence,
      flags:            analysis.flags,
      summary:          analysis.summary,
      font_quality:     analysis.packaging_checks.font_quality,
      logo_accuracy:    analysis.packaging_checks.logo_accuracy,
      print_quality:    analysis.packaging_checks.print_quality,
      label_alignment:  analysis.packaging_checks.label_alignment,
      spelling_check:   analysis.packaging_checks.spelling,
      hologram_check:   analysis.packaging_checks.hologram,
      packaging_checks: analysis.packaging_checks,
    })
  } catch (err) {
    console.error('[vision-cache] Save failed (non-blocking):', err)
  }
}
