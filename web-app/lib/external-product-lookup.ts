// External product lookup waterfall:
//   1. Open Beauty Facts (free, no cap)
//   2. Barcode Lookup API  (free tier: 50 req/day — requires BARCODE_LOOKUP_API_KEY)
//   3. UPCitemdb trial    (free tier: 100 req/day — no key needed)
//
// Returns basic product metadata when the barcode is not in our own DB.
// The verdict stays "unverified" — only Supabase rows carry "authentic" status.

import { getOBFProductByBarcode } from '@/lib/open-beauty-facts'
import { checkApiLimit } from '@/lib/api-rate-limiter'

export interface ExternalProduct {
  name:      string
  brand:     string
  category:  string
  image_url: string | null
  source:    'open_beauty_facts' | 'barcode_lookup' | 'upcitemdb'
}

// ── 1. Open Beauty Facts ──────────────────────────────────────

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

// ── 2. Barcode Lookup ─────────────────────────────────────────

interface BarcodeLookupResponse {
  products?: Array<{
    title:    string
    brand:    string
    category: string
    images:   string[]
  }>
}

async function fromBarcodeLookup(barcode: string): Promise<ExternalProduct | null> {
  const apiKey = process.env.BARCODE_LOOKUP_API_KEY
  if (!apiKey) return null // skip when not configured

  const allowed = await checkApiLimit('barcode_lookup', 50)
  if (!allowed) return null

  try {
    const res = await fetch(
      `https://api.barcodelookup.com/v3/products?barcode=${encodeURIComponent(barcode)}&formatted=y&key=${apiKey}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json() as BarcodeLookupResponse
    const p = data.products?.[0]
    if (!p?.title) return null
    return {
      name:      p.title,
      brand:     p.brand ?? '',
      category:  p.category ?? '',
      image_url: p.images?.[0] ?? null,
      source:    'barcode_lookup',
    }
  } catch {
    return null
  }
}

// ── 3. UPCitemdb ──────────────────────────────────────────────

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
      brand:     item.brand ?? '',
      category:  item.category ?? '',
      image_url: item.images?.[0] ?? null,
      source:    'upcitemdb',
    }
  } catch {
    return null
  }
}

// ── Waterfall ─────────────────────────────────────────────────

const SOURCE_LABELS: Record<ExternalProduct['source'], string> = {
  open_beauty_facts: 'Open Beauty Facts',
  barcode_lookup:    'Barcode Lookup',
  upcitemdb:         'UPCitemdb',
}

export function externalSourceLabel(source: ExternalProduct['source']): string {
  return SOURCE_LABELS[source]
}

export async function lookupExternalProduct(
  barcode: string
): Promise<ExternalProduct | null> {
  return (
    (await fromOBF(barcode)) ??
    (await fromBarcodeLookup(barcode)) ??
    (await fromUPCItemDb(barcode))
  )
}
