// Extracts fake visual patterns from report images using Gemini Vision
// and upserts them into fake_visual_patterns for future scan enrichment.

import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import type { FakeVisualPatternInsert } from './database.types'

// Lazy initialisation — avoids throwing at module load if key is missing
function getGemini(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured')
  return new GoogleGenAI({ apiKey: key })
}

const VALID_MARKER_TYPES = [
  'font', 'logo', 'color', 'hologram', 'seal',
  'text', 'packaging', 'barcode', 'other',
] as const
type MarkerType = typeof VALID_MARKER_TYPES[number]

interface ExtractedPattern {
  marker_type: MarkerType
  description: string
  ai_confidence: number
}

// ── Gemini Vision call ────────────────────────────────────────

async function callGemini(
  images: { base64: string; mimeType: string }[],
  brand: string
): Promise<ExtractedPattern[]> {
  const prompt = `You are a counterfeit product detection expert analysing images of a suspected fake ${brand} product.

Identify specific, observable visual markers that indicate this product is counterfeit.
Only include markers clearly visible in the provided images.

Return ONLY a valid JSON array (no markdown, no code fences, no extra text):
[
  {
    "marker_type": "font|logo|color|hologram|seal|text|packaging|barcode|other",
    "description": "specific observable tell in under 20 words",
    "ai_confidence": 50-100
  }
]

Rules:
- Skip markers you are not confident about (minimum confidence 50)
- Be specific and reproducible (e.g. "CeraVe wordmark uses Arial instead of brand proprietary font")
- Maximum 6 patterns
- Return [] if no clear fake markers are visible`

  const parts = [
    { text: prompt },
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    })),
  ]

  const response = await getGemini().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', temperature: 0 },
  })

  const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(clean)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  return (parsed as unknown[])
    .filter((p): p is ExtractedPattern => {
      if (typeof p !== 'object' || p === null) return false
      const { marker_type, description, ai_confidence } = p as Record<string, unknown>
      return (
        VALID_MARKER_TYPES.includes(marker_type as MarkerType) &&
        typeof description === 'string' &&
        description.trim().length > 0 &&
        typeof ai_confidence === 'number' &&
        ai_confidence >= 50 &&
        ai_confidence <= 100
      )
    })
    .map((p) => ({
      marker_type: p.marker_type,
      description: p.description.trim().slice(0, 200),
      ai_confidence: Math.round(p.ai_confidence),
    }))
    .slice(0, 6)
}

// ── Dedup + upsert ────────────────────────────────────────────

async function upsertPatterns(
  patterns: ExtractedPattern[],
  brand: string,
  productId: string | null
): Promise<void> {
  const supabase = createClient()

  // Load existing patterns for this brand
  const { data: existing } = await supabase
    .from('fake_visual_patterns')
    .select('id, marker_type, description, occurrence_count')
    .eq('brand', brand)

  const now = new Date().toISOString()

  for (const pattern of patterns) {
    // Deduplicate: same marker_type and first 30 chars of description overlap
    const prefix = pattern.description.toLowerCase().slice(0, 30)
    const match = (existing ?? []).find(
      (e) =>
        e.marker_type === pattern.marker_type &&
        e.description.toLowerCase().includes(prefix)
    )

    if (match) {
      await supabase
        .from('fake_visual_patterns')
        .update({
          occurrence_count: match.occurrence_count + 1,
          ai_confidence: pattern.ai_confidence,
          last_seen: now,
        })
        .eq('id', match.id)
    } else {
      const insert: FakeVisualPatternInsert = {
        brand,
        product_id: productId,
        marker_type: pattern.marker_type,
        description: pattern.description,
        ai_confidence: pattern.ai_confidence,
        source_platform: 'report',
        last_seen: now,
      }
      await supabase.from('fake_visual_patterns').insert(insert)
    }
  }
}

// ── Public entry point ────────────────────────────────────────

export async function extractAndStorePatterns(
  images: { base64: string; mimeType: string }[],
  brand: string,
  productId: string | null
): Promise<void> {
  if (!images.length || !brand.trim()) return

  const patterns = await callGemini(images, brand)
  if (!patterns.length) return

  await upsertPatterns(patterns, brand, productId)
}
