/**
 * Seed the products table with data from Open Beauty Facts.
 * Run with: npx tsx scripts/seed-brands.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createClient } from '@supabase/supabase-js'
import { searchOBFByBrand } from '../lib/open-beauty-facts'

const BRANDS = [
  'CeraVe',
  'The Ordinary',
  'La Roche-Posay',
  'Neutrogena',
  'Cetaphil',
  'Tatcha',
  'SK-II',
  'Charlotte Tilbury',
  'Rare Beauty',
  'Fenty Beauty',
]

const PAGE_SIZE = 50
const DELAY_BETWEEN_BRANDS_MS = 6_000

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  for (const brand of BRANDS) {
    console.log(`\nFetching ${brand}...`)

    const products = await searchOBFByBrand(brand, PAGE_SIZE)
    console.log(`  Found ${products.length} products`)

    if (products.length === 0) {
      console.log(`  Skipping — no results`)
      await sleep(DELAY_BETWEEN_BRANDS_MS)
      continue
    }

    const rows = products
      .filter((p) => p.barcode)
      .map((p) => ({
        barcode:                 p.barcode,
        name:                    p.product_name || 'Unknown Product',
        brand:                   p.brand || brand,
        category:                p.categories || 'Beauty',
        country_of_manufacture:  'Unknown',
        authenticated_retailers: [] as string[],
        packaging_notes:         p.ingredients
          ? `Ingredients: ${p.ingredients.slice(0, 500)}`
          : null,
      }))

    const { error, count } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'barcode', count: 'exact' })

    if (error) {
      console.error(`  Upsert error for ${brand}:`, error.message)
    } else {
      console.log(`  Upserted ${count ?? rows.length} rows`)
    }

    await sleep(DELAY_BETWEEN_BRANDS_MS)
  }

  console.log('\nSeed complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
