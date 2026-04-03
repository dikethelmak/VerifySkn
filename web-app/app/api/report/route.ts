import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractAndStorePatterns } from '@/lib/pattern-extraction'

// ── Constants ─────────────────────────────────────────────────

const VALID_ISSUES  = new Set(['counterfeit', 'mislabelled', 'wrong_info', 'other'])
const VALID_MIMES   = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGES    = 3
const MAX_B64_CHARS = 5 * 1024 * 1024 * 1.37  // ~5 MB of raw data in base64
const MAX_PAYLOAD   = 20 * 1024 * 1024          // 20 MB total

const REPORT_EMAIL  = process.env.REPORT_EMAIL_RECIPIENT ?? 'dikethelmak@gmail.com'

// ── IP rate limiting ──────────────────────────────────────────
// Module-level: shared across warm instances, not persisted across cold starts.
// Provides a meaningful guard against rapid-fire abuse from a single IP.

const RATE_LIMIT_MAX      = 5    // max reports per window
const RATE_LIMIT_WINDOW   = 60 * 60 * 1000  // 1 hour in ms
const ipReportCounts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const entry = ipReportCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipReportCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ── Origin validation ─────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[])

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true  // server-side / non-browser requests
  return ALLOWED_ORIGINS.has(origin)
}

const ISSUE_LABELS: Record<string, string> = {
  counterfeit: 'Counterfeit / Fake',
  mislabelled: 'Mislabelled Packaging',
  wrong_info:  'Wrong Information',
  other:       'Other',
}

// ── Nodemailer ────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// ── Helpers ───────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Origin check — reject cross-origin requests from unknown domains
  const origin = request.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // IP-based rate limit
  const ip = getClientIp(request)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many reports — please wait before submitting again.' },
      { status: 429 }
    )
  }

  // Reject oversized payloads before parsing
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_PAYLOAD) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    const raw = await request.json()
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error()
    body = raw as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── Validate barcode ───────────────────────────────────────
  // Accept only digit-only barcodes (EAN-8 through EAN-14, UPC variants)
  const rawBarcode = typeof body.barcode === 'string' ? body.barcode.trim() : ''
  const barcode    = /^\d{6,14}$/.test(rawBarcode) ? rawBarcode : ''

  // ── Validate images ────────────────────────────────────────
  const rawImages = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : []
  for (const img of rawImages) {
    if (typeof img !== 'object' || img === null) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }
    const { base64, mimeType } = img as Record<string, unknown>
    if (typeof base64 !== 'string' || typeof mimeType !== 'string') {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }
    if (!VALID_MIMES.has(mimeType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
    }
    if (base64.length > MAX_B64_CHARS) {
      return NextResponse.json({ error: 'Image too large (max 5 MB each)' }, { status: 400 })
    }
  }
  const images = rawImages as { base64: string; mimeType: string; name?: string }[]

  // ── Validate issues ────────────────────────────────────────
  const issues = (Array.isArray(body.issues) ? body.issues : [])
    .filter((i): i is string => typeof i === 'string' && VALID_ISSUES.has(i))

  if (issues.length === 0) {
    return NextResponse.json({ error: 'At least one issue required' }, { status: 400 })
  }

  // ── Require at least barcode or image ──────────────────────
  if (!barcode && images.length === 0) {
    return NextResponse.json({ error: 'Barcode or image required' }, { status: 400 })
  }

  // ── Validate description ───────────────────────────────────
  const description = typeof body.description === 'string'
    ? body.description.trim().slice(0, 2000)
    : ''

  // ── Resolve brand from barcode ─────────────────────────────
  let brand = ''
  let productId: string | null = null

  if (barcode) {
    try {
      const supabase = createClient()
      const { data: product } = await supabase
        .from('products')
        .select('id, brand')
        .eq('barcode', barcode)
        .maybeSingle()
      if (product) {
        brand = product.brand
        productId = product.id
      }
    } catch (err) {
      console.error('[report] product lookup failed:', err)
      // Non-critical — continue without brand context
    }
  }

  // ── Send email ─────────────────────────────────────────────
  const issueList = issues.map((i) => ISSUE_LABELS[i] ?? i).join(', ')

  const attachments = images.map((img, i) => ({
    filename: img.name?.slice(0, 100) || `image-${i + 1}.jpg`,
    content: img.base64,
    encoding: 'base64' as const,
    contentType: img.mimeType,
  }))

  const html = `
    <div style="font-family:sans-serif;max-width:560px;color:#141414;">
      <h2 style="color:#1A3C2E;margin-bottom:4px;">New Product Report</h2>
      <p style="color:#6B6B6B;font-size:13px;margin-top:0;">Submitted via VerifySkn</p>
      <hr style="border:none;border-top:1px solid #E5E2DD;margin:16px 0;"/>
      ${barcode  ? `<p style="margin:8px 0;"><strong>Barcode:</strong> <code>${escapeHtml(barcode)}</code></p>` : ''}
      ${brand    ? `<p style="margin:8px 0;"><strong>Brand:</strong> ${escapeHtml(brand)}</p>` : ''}
      <p style="margin:8px 0;"><strong>Issues:</strong> ${escapeHtml(issueList)}</p>
      ${description ? `
        <p style="margin:8px 0;"><strong>Description:</strong></p>
        <p style="background:#F7F5F2;padding:12px 16px;border-radius:8px;font-size:14px;line-height:1.6;">
          ${escapeHtml(description)}
        </p>` : ''}
      ${attachments.length > 0 ? `<p style="margin:16px 0 4px;"><strong>Photos:</strong> ${attachments.length} attached</p>` : ''}
      ${issues.includes('counterfeit') && images.length > 0 && brand
        ? `<p style="margin:8px 0;color:#6B6B6B;font-size:12px;">ℹ️ Visual patterns will be extracted and added to the database.</p>`
        : ''}
    </div>
  `

  try {
    await transporter.sendMail({
      from: `VerifySkn Reports <${process.env.GMAIL_USER}>`,
      to: REPORT_EMAIL,
      subject: `New Report${barcode ? ` — ${barcode}` : ''}: ${issueList}`,
      html,
      attachments,
    })
  } catch (err) {
    console.error('[report] email failed:', err)
    return NextResponse.json({ error: 'Failed to send report — please try again.' }, { status: 500 })
  }

  // ── Extract patterns (fire-and-forget) ─────────────────────
  // Only runs for counterfeit reports with images from a known brand.
  // Runs asynchronously — does not block the response.
  if (issues.includes('counterfeit') && images.length > 0 && brand) {
    extractAndStorePatterns(
      images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
      brand,
      productId
    ).catch((err) => console.error('[report] pattern extraction failed:', err))
  }

  return NextResponse.json({ success: true })
}
