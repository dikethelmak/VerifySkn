const BASE_URL = 'https://world.openbeautyfacts.org'
const USER_AGENT = 'VerifySkn/1.0 (dev@verifyskin.com)'

export interface OBFProduct {
  barcode: string
  product_name: string
  brand: string
  ingredients: string
  image_url: string | null
  categories: string
  quantity: string
  how_to_use: string | null
}

const FIELDS = 'code,product_name,brands,ingredients_text,image_front_url,categories,quantity,how_to_use_en'

function normaliseProduct(p: Record<string, unknown>): OBFProduct {
  return {
    barcode: String(p.code ?? p._id ?? ''),
    product_name: String(p.product_name ?? ''),
    brand: String(p.brands ?? ''),
    ingredients: String(p.ingredients_text ?? ''),
    image_url: (p.image_front_url as string) ?? null,
    categories: String(p.categories ?? ''),
    quantity: String(p.quantity ?? ''),
    how_to_use: (p.how_to_use_en as string) || null,
  }
}

export async function getOBFProductByBarcode(barcode: string): Promise<OBFProduct | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/v2/product/${barcode}.json?fields=${FIELDS}`,
      { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    return normaliseProduct(data.product)
  } catch {
    return null
  }
}

export async function searchOBFByBrand(brand: string, pageSize = 24): Promise<OBFProduct[]> {
  try {
    const slug = brand.toLowerCase().replace(/\s+/g, '-')
    const res = await fetch(
      `${BASE_URL}/api/v2/search?brands_tags=${slug}&fields=${FIELDS}&page_size=${pageSize}`,
      { headers: { 'User-Agent': USER_AGENT } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.products ?? []).map(normaliseProduct).filter(Boolean)
  } catch {
    return []
  }
}

export async function searchOBFByName(query: string): Promise<OBFProduct[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&fields=${FIELDS}`,
      { headers: { 'User-Agent': USER_AGENT } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.products ?? []).map(normaliseProduct).filter(Boolean)
  } catch {
    return []
  }
}
