import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'
import type { Product, ScanVerdict } from './database.types'

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export interface VerificationAnalysis {
  summary: string
  flags: string[]
  recommendation: string
}

interface AnalysisParams {
  barcode: string
  product: Product | null
  verdict: ScanVerdict
  confidence: number
}

function buildPrompt({ barcode, product, verdict, confidence }: AnalysisParams): string {
  const productContext = product
    ? `Product found in database: ${product.name} by ${product.brand}
Category: ${product.category}
Country of manufacture: ${product.country_of_manufacture}
Size: ${product.size_ml ? `${product.size_ml}ml` : 'unspecified'}
Authorised retailers: ${product.authenticated_retailers.join(', ')}
Packaging notes on file: ${product.packaging_notes ?? 'none'}`
    : 'No matching product found in the VerifySkn database for this barcode.'

  return `You are an expert skincare product authenticator for VerifySkn, a consumer product verification service.

Barcode scanned: ${barcode}
Initial verdict: ${verdict} (${confidence}% confidence)
${productContext}

Provide a practical, specific authenticity analysis a consumer can act on immediately.

Return ONLY valid JSON with no markdown, no code fences, no other text:
{
  "summary": "1-2 sentence plain-English summary of this specific result",
  "flags": ["specific physical thing to check 1", "specific physical thing to check 2", "specific physical thing to check 3"],
  "recommendation": "one clear actionable sentence"
}

Rules:
- Keep each flag under 15 words and make it physical/observable
- If the product is authentic, flags should confirm genuine markers to look for
- If unverified or suspicious, flags should be warning signs to inspect
- Be specific to this product and brand where possible`
}

function parseResult(raw: string): VerificationAnalysis {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(clean)
  return {
    summary: String(parsed.summary ?? ''),
    flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 3).map(String) : [],
    recommendation: String(parsed.recommendation ?? ''),
  }
}

async function analyseWithGemini(prompt: string): Promise<VerificationAnalysis> {
  const response = await gemini.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  })
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return parseResult(text)
}

async function analyseWithGroq(prompt: string): Promise<VerificationAnalysis> {
  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0,
  })
  const text = completion.choices[0]?.message?.content ?? ''
  return parseResult(text)
}

export async function analyzeProductAuthenticity(
  params: AnalysisParams
): Promise<VerificationAnalysis | null> {
  const prompt = buildPrompt(params)

  // 1. Try Gemini first
  try {
    return await analyseWithGemini(prompt)
  } catch (error) {
    const isQuota =
      error instanceof Error &&
      /429|quota|resource_exhausted|rate limit/i.test(error.message)

    if (isQuota) {
      console.warn('[Gemini] Quota reached, falling back to Groq')
    } else {
      console.error('[Gemini] Unexpected error, falling back to Groq:', error)
    }
  }

  // 2. Fall back to Groq
  try {
    return await analyseWithGroq(prompt)
  } catch (err) {
    console.error('[claude] analyzeProductAuthenticity failed:', err)
    return null
  }
}
