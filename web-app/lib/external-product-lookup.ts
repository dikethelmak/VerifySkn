// External product lookup waterfall (called when barcode not in our Supabase DB):
//   1. Go-UPC          — broadest general coverage (requires GO_UPC_API_KEY)
//   2. UPCitemdb trial — second fallback, 100 req/day, no key needed
//   3. Open Beauty Facts — third fallback, free, strong on European/beauty
//
// Ingredient enrichment via Cosmethics is handled separately in lib/cosmethics.ts.

import { getOBFProductByBarcode } from '@/lib/open-beauty-facts'
import { checkApiLimit } from '@/lib/api-rate-limiter'

export interface ExternalProduct {
  name:      string
  brand:     string
  category:  string
  image_url: string | null
  source:    'go_upc' | 'upcitemdb' | 'open_beauty_facts'
}

// ── 1. Go-UPC ─────────────────────────────────────────────────
// Sign up at go-upc.com → API Keys. Set GO_UPC_API_KEY + GO_UPC_DAILY_CAP in env.
// Default daily cap is conservative (5/day ≈ 150/month on a 100-200/month free plan).

interface GoUPCResponse {
  product?: {
    name:     string
    brand:    string | null
    category: string | null
    imageUrl: string | null
  }
}

async function fromGoUPC(barcode: string): Promise<ExternalProduct | null> {
  const apiKey = process.env.GO_UPC_API_KEY
  if (!apiKey) return null

  const dailyCap = parseInt(process.env.GO_UPC_DAILY_CAP ?? '5', 10)
  const allowed = await checkApiLimit('go_upc', dailyCap)
  if (!allowed) return null

  try {
    const res = await fetch(
      `https://go-upc.com/api/v1/code/${encodeURIComponent(barcode)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal:  AbortSignal.timeout(8000),
        next:    { revalidate: 86400 },
      }
    )
    if (!res.ok) return null
    const data = await res.json() as GoUPCResponse
    const p = data.product
    if (!p?.name) return null
    return {
      name:      p.name,
      brand:     p.brand     ?? '',
      category:  p.category  ?? '',
      image_url: p.imageUrl  ?? null,
      source:    'go_upc',
    }
  } catch {
    return null
  }
}

// ── 2. UPCitemdb ──────────────────────────────────────────────
// Trial endpoint — no key required, 100 req/day.

interface UPCItemDbResponse {
  total: number
  items?: Array<{
    title:    string
    brand:    string
    category: string
    images:   string[]
  }>
}

async function fromUPCItemDb(barcode: string): Promise<ExternalProduct | null> {
  const allowed = await checkApiLimit('upcitemdb', 100)
  if (!allowed) return null

  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
      {
        headers: { Accept: 'application/json' },
        signal:  AbortSignal.timeout(8000),
        next:    { revalidate: 86400 },
      }
    )
    if (!res.ok) return null
    const data = await res.json() as UPCItemDbResponse
    const item = data.items?.[0]
    if (!item?.title) return null
    return {
      name:      item.title,
      brand:     item.brand    ?? '',
      category:  item.category ?? '',
      image_url: item.images?.[0] ?? null,
      source:    'upcitemdb',
    }
  } catch {
    return null
  }
}

// ── 3. Open Beauty Facts ──────────────────────────────────────
// Free, no key, unlimited — best for beauty/cosmetic products.

async function fromOBF(barcode: string): Promise<ExternalProduct | null> {
  try {
    const product = await getOBFProductByBarcode(barcode)
    if (!product?.product_name) return null
    return {
      name:      product.product_name,
      brand:     product.brand,
      category:  product.categories.split(',')[0].trim(),
      image_url: product.image_url,
      source:    'open_beauty_facts',
    }
  } catch {
    return null
  }
}

// ── Source labels ─────────────────────────────────────────────

const SOURCE_LABELS: Record<ExternalProduct['source'], string> = {
  go_upc:            'Go-UPC',
  upcitemdb:         'UPCitemdb',
  open_beauty_facts: 'Open Beauty Facts',
}

export function externalSourceLabel(source: ExternalProduct['source']): string {
  return SOURCE_LABELS[source]
}

// ── Waterfall ─────────────────────────────────────────────────

export async function lookupExternalProduct(
  barcode: string
): Promise<ExternalProduct | null> {
  return (
    (await fromGoUPC(barcode))    ??
    (await fromUPCItemDb(barcode)) ??
    (await fromOBF(barcode))
  )
}
