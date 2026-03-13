import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'
import { validateProductImage } from '@/lib/image-validator'
import { getCachedAnalysis, saveAnalysisToCache } from '@/lib/vision-cache'
import { checkDailyVisionLimit } from '@/lib/vision-rate-limiter'
import { createClient } from '@/lib/supabase/server'
import { computeCombinedResult } from '@/lib/scoring'
import type { ScanVerdict } from '@/lib/database.types'

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

// ── Prompts ───────────────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are a skincare product authentication expert.
Analyse product packaging images to identify signs of counterfeiting.
Respond ONLY in valid JSON with no markdown or preamble.`

const FULL_USER_PROMPT = (brand?: string, productName?: string) =>
  `Analyse this ${brand ? `${brand} ` : ''}${productName ?? 'skincare'} product packaging for authenticity.

Check ALL of the following:
- Font consistency and quality (blurring, irregular spacing, wrong weights)
- Logo accuracy and print quality
- Label alignment and print registration
- Colour accuracy of brand colours
- Hologram or seal presence
- Spelling errors or grammatical inconsistencies

Return JSON only:
{
  "result": "authentic" | "suspicious" | "unverified",
  "confidence": number (0-100),
  "flags": string[],
  "summary": string,
  "packaging_checks": {
    "font_quality": "pass" | "fail" | "uncertain",
    "logo_accuracy": "pass" | "fail" | "uncertain",
    "print_quality": "pass" | "fail" | "uncertain",
    "label_alignment": "pass" | "fail" | "uncertain",
    "spelling": "pass" | "fail" | "uncertain",
    "hologram": "pass" | "fail" | "uncertain" | "not_applicable"
  }
}`

const QUICK_USER_PROMPT = (brand?: string, productName?: string) =>
  `Quickly check this ${brand ? `${brand} ` : ''}${productName ?? 'skincare'} packaging.
Focus ONLY on font quality and logo accuracy — these are the highest-signal indicators.
Set all other packaging_checks fields to "uncertain" or "not_applicable".

Return JSON only:
{
  "result": "authentic" | "suspicious" | "unverified",
  "confidence": number (0-100),
  "flags": string[],
  "summary": string,
  "packaging_checks": {
    "font_quality": "pass" | "fail" | "uncertain",
    "logo_accuracy": "pass" | "fail" | "uncertain",
    "print_quality": "uncertain",
    "label_alignment": "uncertain",
    "spelling": "uncertain",
    "hologram": "not_applicable"
  }
}`

// ── Types ─────────────────────────────────────────────────────────────────────

interface PackagingAnalysis {
  result: 'authentic' | 'suspicious' | 'unverified'
  confidence: number
  flags: string[]
  summary: string
  packaging_checks: {
    font_quality: 'pass' | 'fail' | 'uncertain'
    logo_accuracy: 'pass' | 'fail' | 'uncertain'
    print_quality: 'pass' | 'fail' | 'uncertain'
    label_alignment: 'pass' | 'fail' | 'uncertain'
    spelling: 'pass' | 'fail' | 'uncertain'
    hologram: 'pass' | 'fail' | 'uncertain' | 'not_applicable'
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Fix 2: wrap JSON.parse so callers get a clear error and can fall back to Groq
function parseAnalysis(raw: string): PackagingAnalysis {
  const clean = raw.replace(/```json|```/g, '').trim()

  if (!clean) {
    throw new Error('Vision model returned an empty response (possibly blocked by safety filter)')
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(clean)
  } catch {
    throw new Error(`Vision model returned non-JSON: ${clean.slice(0, 120)}`)
  }

  return {
    result: ['authentic', 'suspicious', 'unverified'].includes(parsed.result as string)
      ? (parsed.result as PackagingAnalysis['result'])
      : 'unverified',
    confidence: typeof parsed.confidence === 'number'
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 50,
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    summary: (parsed.summary as string) ?? 'Analysis complete.',
    packaging_checks: {
      font_quality:    (parsed.packaging_checks as Record<string, string>)?.font_quality    ?? 'uncertain',
      logo_accuracy:   (parsed.packaging_checks as Record<string, string>)?.logo_accuracy   ?? 'uncertain',
      print_quality:   (parsed.packaging_checks as Record<string, string>)?.print_quality   ?? 'uncertain',
      label_alignment: (parsed.packaging_checks as Record<string, string>)?.label_alignment ?? 'uncertain',
      spelling:        (parsed.packaging_checks as Record<string, string>)?.spelling        ?? 'uncertain',
      hologram:        (parsed.packaging_checks as Record<string, string>)?.hologram        ?? 'not_applicable',
    } as PackagingAnalysis['packaging_checks'],
  }
}

function isGeminiQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return msg.includes('429') || msg.includes('quota') ||
    msg.includes('resource_exhausted') || msg.includes('rate limit')
}

// ── Gemini schema ─────────────────────────────────────────────────────────────

const GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    result:     { type: 'STRING', enum: ['authentic', 'suspicious', 'unverified'] },
    confidence: { type: 'NUMBER' },
    flags:      { type: 'ARRAY', items: { type: 'STRING' } },
    summary:    { type: 'STRING' },
    packaging_checks: {
      type: 'OBJECT',
      properties: {
        font_quality:    { type: 'STRING', enum: ['pass', 'fail', 'uncertain'] },
        logo_accuracy:   { type: 'STRING', enum: ['pass', 'fail', 'uncertain'] },
        print_quality:   { type: 'STRING', enum: ['pass', 'fail', 'uncertain'] },
        label_alignment: { type: 'STRING', enum: ['pass', 'fail', 'uncertain'] },
        spelling:        { type: 'STRING', enum: ['pass', 'fail', 'uncertain'] },
        hologram:        { type: 'STRING', enum: ['pass', 'fail', 'uncertain', 'not_applicable'] },
      },
      required: ['font_quality', 'logo_accuracy', 'print_quality', 'label_alignment', 'spelling', 'hologram'],
    },
  },
  required: ['result', 'confidence', 'flags', 'summary', 'packaging_checks'],
}

// ── Vision providers ──────────────────────────────────────────────────────────

async function analyseWithGemini(
  base64Image: string,
  mimeType: string,
  userPrompt: string
): Promise<PackagingAnalysis> {
  const response = await gemini.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [
        { text: `${BASE_SYSTEM}\n\n${userPrompt}` },
        { inlineData: { mimeType, data: base64Image } },
      ],
    }],
    config: { responseMimeType: 'application/json', responseSchema: GEMINI_SCHEMA, temperature: 0 },
  })

  // Fix 12: handle safety filter rejections (empty candidates = 200 but refused)
  const candidate = response.candidates?.[0]
  if (!candidate || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
    throw new Error(`Gemini refused the image (finishReason: ${candidate?.finishReason ?? 'no candidates'})`)
  }

  const text = candidate.content?.parts?.[0]?.text ?? ''
  return parseAnalysis(text)
}

async function analyseWithGroq(
  base64Image: string,
  mimeType: string,
  userPrompt: string
): Promise<PackagingAnalysis> {
  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: `${BASE_SYSTEM}\n\n${userPrompt}` },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
      ],
    }],
    response_format: { type: 'json_object' },
    temperature: 0,
  })
  const text = completion.choices[0]?.message?.content ?? ''
  return parseAnalysis(text)
}

async function analysePackaging(
  base64Image: string,
  mimeType: string,
  userPrompt: string
): Promise<PackagingAnalysis & { provider: string }> {
  try {
    const result = await analyseWithGemini(base64Image, mimeType, userPrompt)
    return { ...result, provider: 'gemini-2.5-flash' }
  } catch (error) {
    if (isGeminiQuotaError(error)) {
      console.warn('[Gemini] Quota reached, switching to Groq')
    } else {
      console.error('[Gemini] Error, falling back to Groq:', (error as Error).message)
    }
  }

  try {
    const result = await analyseWithGroq(base64Image, mimeType, userPrompt)
    return { ...result, provider: 'groq-llama-4-scout' }
  } catch (error) {
    console.error('[Groq] Failed:', error)
    throw new Error('All vision providers failed')
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, mimeType, barcode, productName, brand, sessionId: incomingSessionId } = body

    if (!image || !mimeType) {
      return NextResponse.json({ error: 'image and mimeType are required' }, { status: 400 })
    }

    // Risk 2: pre-screen before any API call
    const validation = validateProductImage(image, mimeType)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 })
    }

    // Fix 3: honour the barcode session_id so combined results can be linked
    const sessionId = typeof incomingSessionId === 'string' && incomingSessionId
      ? incomingSessionId
      : crypto.randomUUID()

    const supabase = createClient()

    // Fix 5: derive barcode confidence from DB — never trust the client value
    let barcodeResult: ScanVerdict | null = null
    let barcodeConfidence: number | null = null
    let productId: string | null = null

    // Only query DB with well-formed barcodes (EAN-8/13 or UPC-A/E: digits only, 6–14 chars)
    const validBarcode = typeof barcode === 'string' && /^\d{6,14}$/.test(barcode)

    if (validBarcode) {
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('barcode', barcode)
        .maybeSingle()

      barcodeResult     = product ? 'authentic' : 'unverified'
      barcodeConfidence = product ? 92 : 50
      productId         = product?.id ?? null
    }

    // Risk 3: cache check — BEFORE rate limit so cache hits don't burn quota (Fix 1)
    const cached = await getCachedAnalysis(barcode, brand)

    if (cached) {
      // Await so the session_id row exists before we return it to the client
      await saveAnalysisToCache(cached, sessionId, barcode, brand)

      // Fix 3: write combined result even for cache hits
      if (barcodeResult !== null && barcodeConfidence !== null) {
        const combined = computeCombinedResult({
          barcodeResult, barcodeConfidence,
          imageResult: cached.result, imageConfidence: cached.confidence,
        })
        supabase.from('combined_results').insert({
          session_id:         sessionId,
          barcode_result:     barcodeResult,
          barcode_confidence: barcodeConfidence,
          image_result:       cached.result,
          image_confidence:   cached.confidence,
          final_result:       combined.finalResult,
          final_confidence:   combined.finalConfidence,
          product_id:         productId,
        }).catch(() => {})
      }

      return NextResponse.json({ ...cached, sessionId, fromCache: true })
    }

    // Fix 1: only check rate limit when we're about to call an API
    const rateLimit = await checkDailyVisionLimit()
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'High demand — image analysis is temporarily unavailable. Try again tomorrow.' },
        { status: 429 }
      )
    }

    // Risk 5: use derived confidence (Fix 5) — never the client-supplied value
    const highConfidence = barcodeConfidence !== null && barcodeConfidence > 70
    const userPrompt = highConfidence
      ? QUICK_USER_PROMPT(brand, productName)
      : FULL_USER_PROMPT(brand, productName)

    const analysis = await analysePackaging(image, mimeType, userPrompt)

    // Await so the row exists before we return the sessionId to the client
    await saveAnalysisToCache(analysis, sessionId, barcode, brand)

    // Fix 3: write combined result when barcode was also scanned
    if (barcodeResult !== null && barcodeConfidence !== null) {
      const combined = computeCombinedResult({
        barcodeResult, barcodeConfidence,
        imageResult: analysis.result, imageConfidence: analysis.confidence,
      })
      supabase.from('combined_results').insert({
        session_id:         sessionId,
        barcode_result:     barcodeResult,
        barcode_confidence: barcodeConfidence,
        image_result:       analysis.result,
        image_confidence:   analysis.confidence,
        final_result:       combined.finalResult,
        final_confidence:   combined.finalConfidence,
        product_id:         productId,
      }).catch(() => {})
    }

    return NextResponse.json({ ...analysis, sessionId, fromCache: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
