import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOBFProductByBarcode } from '@/lib/open-beauty-facts'
import { generateProductUsage } from '@/lib/product-usage'

// Barcodes: digits and hyphens only, 4–50 chars (covers EAN, UPC, CODE-128/39)
const BARCODE_RE = /^[\d\-A-Za-z]{4,50}$/

export async function GET(
  _request: NextRequest,
  { params }: { params: { barcode: string } }
) {
  const { barcode } = params

  if (!BARCODE_RE.test(barcode)) {
    return NextResponse.json({ error: 'Invalid barcode' }, { status: 400 })
  }

  const supabase = createClient()

  // 1. Check our own products table first
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle()

  if (product) {
    // Generate usage info if missing, save back to DB, return enriched product
    if (!product.how_to_use && !product.skin_type_suitability) {
      const usage = await generateProductUsage(product.name, product.brand, product.category)
      if (usage) {
        void supabase.from('products').update(usage).eq('barcode', barcode)
        return NextResponse.json({ ...product, ...usage, source: 'database' })
      }
    }
    return NextResponse.json({ ...product, source: 'database' })
  }

  // 2. Fall back to Open Beauty Facts
  const obfProduct = await getOBFProductByBarcode(barcode)

  if (obfProduct) {
    const name     = obfProduct.product_name || 'Unknown Product'
    const brand    = obfProduct.brand        || 'Unknown Brand'
    const category = obfProduct.categories   || 'Beauty'

    const usage = await generateProductUsage(name, brand, category)

    void supabase
      .from('products')
      .upsert(
        {
          barcode:                 obfProduct.barcode,
          name,
          brand,
          category,
          country_of_manufacture:  'Unknown',
          authenticated_retailers: [],
          packaging_notes:         obfProduct.ingredients
            ? `Ingredients: ${obfProduct.ingredients.slice(0, 500)}`
            : null,
          how_to_use:              usage?.how_to_use              ?? obfProduct.how_to_use ?? null,
          skin_type_suitability:   usage?.skin_type_suitability   ?? null,
          key_ingredients:         usage?.key_ingredients         ?? null,
        },
        { onConflict: 'barcode' }
      )

    return NextResponse.json({ ...obfProduct, ...usage, source: 'open_beauty_facts', verified: false })
  }

  // 3. Not found anywhere
  return NextResponse.json(
    { barcode, source: 'not_found', message: 'Product not found. Consider submitting it.' },
    { status: 404 }
  )
}
