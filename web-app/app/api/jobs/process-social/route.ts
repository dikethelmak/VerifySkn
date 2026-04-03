// process-social cron job
// ─────────────────────────────────────────────────────────────────────────────
// Reads unprocessed rows from social_intelligence_cache, runs them through
// Gemini to:
//   1. Classify whether each post is a genuine fake-product report
//   2. Extract specific visual markers (font, logo, color, etc.) from text
//   3. For posts with images: download and run vision analysis to extract markers
//   4. Upsert findings into fake_visual_patterns
//   5. Update rolling fake-report counts in social_signal_summary
//
// Triggered by Vercel Cron (or manually) via POST with x-cron-secret header.
// Processes BATCH_SIZE entries per run to stay within Vercel's 60s timeout.

import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const BATCH_SIZE             = 20   // entries per run
const MAX_IMAGE_BYTES        = 4 * 1024 * 1024  // 4 MB
const MAX_VISION_CALLS_PER_RUN = 30  // hard cap on Gemini vision calls per cron trigger

// ── Auth ──────────────────────────────────────────────────────

function verifyCronSecret(request: NextRequest): boolean {
  const secret   = request.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!secret || !expected) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ── Extracted-marker types ────────────────────────────────────

type MarkerType = 'font' | 'logo' | 'color' | 'hologram' | 'seal' |
                  'text' | 'packaging' | 'barcode' | 'other'

interface ExtractedMarker {
  marker_type: MarkerType
  description: string
  confidence:  number
}

interface TextExtractionResult {
  is_fake_report: boolean
  markers:        ExtractedMarker[]
}

// ── Gemini helpers ────────────────────────────────────────────

async function extractMarkersFromText(
  content: string,
  brand: string
): Promise<TextExtractionResult> {
  const prompt = `You are a product authentication analyst.

Analyse this social media post about ${brand} products.

POST CONTENT:
${content.slice(0, 2500)}

Tasks:
1. Determine if this post is genuinely reporting a fake, counterfeit, or replica product.
   Minor complaints about quality do NOT count — only posts claiming the product is not authentic.
2. If it is a fake report, extract specific visual markers that would help someone
   identify the fake vs authentic product from the packaging.

Return JSON only — no preamble, no markdown:
{
  "is_fake_report": boolean,
  "markers": [
    {
      "marker_type": "font" | "logo" | "color" | "hologram" | "seal" | "text" | "packaging" | "barcode" | "other",
      "description": "specific observable visual difference in plain English (max 120 chars)",
      "confidence": number (0-100, how confident you are this is a real fake tell)
    }
  ]
}`

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config:   { responseMimeType: 'application/json', temperature: 0 },
    })
    const text  = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    if (!clean) return { is_fake_report: false, markers: [] }
    return JSON.parse(clean) as TextExtractionResult
  } catch {
    return { is_fake_report: false, markers: [] }
  }
}

async function extractMarkersFromImage(
  imageUrl: string,
  brand: string
): Promise<ExtractedMarker[]> {
  // Download image, respecting size limit
  let base64: string
  let mimeType: string

  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return []
    const ct = res.headers.get('content-type') ?? 'image/jpeg'
    mimeType = ct.split(';')[0].trim()
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return []
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_BYTES) return []
    base64 = Buffer.from(buffer).toString('base64')
  } catch {
    return []
  }

  const prompt = `This image is from a social media post claiming this ${brand} skincare product is fake/counterfeit.

Identify specific, observable visual markers that distinguish this fake from an authentic product.
Focus on:
- Font weight, spacing, or typeface differences on the label
- Logo shape, placement, or colour inaccuracies
- Colour inconsistencies vs brand colours
- Hologram, seal, or security feature differences
- Text layout, alignment, or spelling differences
- Packaging material, shape, or finish differences
- Barcode placement or format differences

Return a JSON array only — no preamble, no markdown:
[
  {
    "marker_type": "font" | "logo" | "color" | "hologram" | "seal" | "text" | "packaging" | "barcode" | "other",
    "description": "specific observable difference in plain English (max 120 chars)",
    "confidence": number (0-100)
  }
]

If the image does not appear to show a counterfeit or you cannot identify specific fake markers, return [].`

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } },
        ],
      }],
      config: { responseMimeType: 'application/json', temperature: 0 },
    })

    const candidate = response.candidates?.[0]
    // Skip safety-blocked responses
    if (!candidate || candidate.finishReason === 'SAFETY') return []

    const text  = candidate.content?.parts?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    if (!clean) return []
    const parsed = JSON.parse(clean)
    return Array.isArray(parsed) ? (parsed as ExtractedMarker[]) : []
  } catch {
    return []
  }
}

// ── DB helpers ────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createClient>

async function upsertPattern(
  supabase: SupabaseClient,
  brand:    string,
  marker:   ExtractedMarker,
  sourceUrl: string,
  platform:  string
): Promise<void> {
  const descLower = marker.description.toLowerCase()
  const anchor    = descLower.slice(0, 35) // 35-char anchor for fuzzy match

  const { data: existingFull } = await supabase
    .from('fake_visual_patterns')
    .select('id, occurrence_count, description')
    .eq('brand', brand)
    .eq('marker_type', marker.marker_type)
    .limit(15)

  const match = (existingFull ?? []).find((e) => {
    const eLower = (e.description as string).toLowerCase()
    return eLower.includes(anchor) || descLower.includes(eLower.slice(0, 35))
  })

  if (match) {
    await supabase
      .from('fake_visual_patterns')
      .update({
        occurrence_count: (match.occurrence_count as number) + 1,
        last_seen:        new Date().toISOString(),
        ai_confidence:    marker.confidence,
      })
      .eq('id', match.id)
  } else {
    await supabase.from('fake_visual_patterns').insert({
      brand,
      marker_type:     marker.marker_type,
      description:     marker.description,
      source_post_url: sourceUrl,
      source_platform: platform,
      ai_confidence:   marker.confidence,
      occurrence_count: 1,
    })
  }
}

async function incrementBrandSignal(
  supabase:   SupabaseClient,
  brand:      string,
  newReports: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('social_signal_summary')
    .select('id, fake_reports_7d, fake_reports_30d, fake_reports_90d, total_reports')
    .eq('brand', brand)
    .is('product_id', null)
    .maybeSingle()

  const now = new Date().toISOString()

  if (existing) {
    const r30 = ((existing.fake_reports_30d as number) ?? 0) + newReports
    await supabase
      .from('social_signal_summary')
      .update({
        fake_reports_7d:  ((existing.fake_reports_7d  as number) ?? 0) + newReports,
        fake_reports_30d: r30,
        fake_reports_90d: ((existing.fake_reports_90d as number) ?? 0) + newReports,
        total_reports:    ((existing.total_reports    as number) ?? 0) + newReports,
        trending:         r30 >= 10,
        last_updated:     now,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('social_signal_summary').insert({
      brand,
      product_id:      null,
      fake_reports_7d:  newReports,
      fake_reports_30d: newReports,
      fake_reports_90d: newReports,
      total_reports:    newReports,
      trending:         newReports >= 10,
      last_updated:     now,
    })
  }
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase   = createClient()
  const today      = new Date().toISOString().slice(0, 10)
  const jobId      = `process-social-${today}`
  const startedAt  = new Date().toISOString()

  await supabase.from('scrape_jobs').upsert({
    id:         jobId,
    job_type:   'process-social',
    status:     'running',
    started_at: startedAt,
    metadata:   {},
  }, { onConflict: 'id' })

  try {
    // Fetch next batch — prioritise high-engagement posts (more signal)
    const { data: entries, error } = await supabase
      .from('social_intelligence_cache')
      .select('*')
      .eq('processed', false)
      .order('engagement_score', { ascending: false })
      .limit(BATCH_SIZE)

    if (error) throw error

    let entriesProcessed  = 0
    let fakeReportsFound  = 0
    let markersExtracted  = 0
    let visionCallsThisRun = 0

    // Track new fake reports per brand so we can update summaries once at the end
    const brandNewReports: Record<string, number> = {}

    for (const entry of entries ?? []) {
      try {
        // ── Step 1: classify text content ──────────────────
        const textResult = await extractMarkersFromText(entry.content as string, entry.brand as string)

        if (textResult.is_fake_report) {
          fakeReportsFound++
          brandNewReports[entry.brand as string] =
            (brandNewReports[entry.brand as string] ?? 0) + 1

          // ── Step 2: upsert text-extracted markers ──────
          for (const marker of textResult.markers) {
            if (marker.confidence < 50) continue
            await upsertPattern(supabase, entry.brand as string, marker, entry.post_url as string, entry.platform as string)
            markersExtracted++
          }

          // ── Step 3: analyse images (capped per run) ────
          for (const imageUrl of (entry.image_urls as string[]) ?? []) {
            if (visionCallsThisRun >= MAX_VISION_CALLS_PER_RUN) {
              console.warn(`[process-social] Vision call cap (${MAX_VISION_CALLS_PER_RUN}) reached, skipping remaining images`)
              break
            }
            visionCallsThisRun++
            const imageMarkers = await extractMarkersFromImage(imageUrl, entry.brand as string)
            for (const marker of imageMarkers) {
              if (marker.confidence < 60) continue
              await upsertPattern(supabase, entry.brand as string, marker, entry.post_url as string, entry.platform as string)
              markersExtracted++
            }
          }
        }

        // Mark processed regardless — we don't want to re-analyse non-fake posts
        await supabase
          .from('social_intelligence_cache')
          .update({ processed: true })
          .eq('id', entry.id)

        entriesProcessed++
      } catch (err) {
        console.error(`[process-social] Failed on entry ${entry.id}:`, err)
        // Don't re-throw — move on to the next entry
      }
    }

    // ── Step 4: update brand signal summaries ─────────────
    for (const [brand, count] of Object.entries(brandNewReports)) {
      await incrementBrandSignal(supabase, brand, count).catch((err) =>
        console.error(`[process-social] Signal update failed for ${brand}:`, err)
      )
    }

    await supabase.from('scrape_jobs').update({
      status:       'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        entries_processed: entriesProcessed,
        fake_reports_found: fakeReportsFound,
        markers_extracted:  markersExtracted,
      },
    }).eq('id', jobId)

    return NextResponse.json({
      jobId,
      entries_processed:  entriesProcessed,
      fake_reports_found: fakeReportsFound,
      markers_extracted:  markersExtracted,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await supabase.from('scrape_jobs')
      .update({ status: 'failed', metadata: { error: message } })
      .eq('id', jobId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
