import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOBFProductByBarcode } from '@/lib/open-beauty-facts'

export async function GET(
  _request: NextRequest,
  { params }: { params: { barcode: string } }
) {
  const { barcode } = params
  const supabase = createClient()

  // 1. Check our own products table first
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle()

  if (product) {
    return NextResponse.json({ ...product, source: 'database' })
  }

  // 2. Fall back to Open Beauty Facts
  const obfProduct = await getOBFProductByBarcode(barcode)

  if (obfProduct) {
    // Fix 6: upsert instead of insert so duplicate barcodes don't fail silently
    supabase
      .from('products')
      .upsert(
        {
          barcode:                 obfProduct.barcode,
          name:                    obfProduct.product_name || 'Unknown Product',
          brand:                   obfProduct.brand        || 'Unknown Brand',
          category:                obfProduct.categories   || 'Beauty',
          country_of_manufacture:  'Unknown',
          authenticated_retailers: [],
          packaging_notes:         obfProduct.ingredients
            ? `Ingredients: ${obfProduct.ingredients.slice(0, 500)}`
            : null,
        },
        { onConflict: 'barcode' }
      )
      .then(() => {})
      .catch((err: unknown) => console.error('[product/barcode] OBF cache upsert failed:', err))

    return NextResponse.json({ ...obfProduct, source: 'open_beauty_facts', verified: false })
  }

  // 3. Not found anywhere
  return NextResponse.json(
    { barcode, source: 'not_found', message: 'Product not found. Consider submitting it.' },
    { status: 404 }
  )
}
