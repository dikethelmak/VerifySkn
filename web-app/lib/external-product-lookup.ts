// External product lookup waterfall (called when barcode not in our Supabase DB):
//   1. UPCitemdb trial — 100 req/day, no key needed
//   2. Open Beauty Facts — free, unlimited, strong on European/beauty
//
// Ingredient enrichment via Cosmethics is handled separately in lib/cosmethics.ts.

import { getOBFProductByBarcode } from '@/lib/open-beauty-facts'
import { checkApiLimit } from '@/lib/api-rate-limiter'

export interface ExternalProduct {
  name:      string
  brand:     string
  category:  string
  image_url: string | null
  source:    'upcitemdb' | 'open_beauty_facts'
}

// ── 1. UPCitemdb ──────────────────────────────────────────────
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
    (await fromUPCItemDb(barcode)) ??
    (await fromOBF(barcode))
  )
}
