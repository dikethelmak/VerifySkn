// Cosmethics API — ingredient-level enrichment.
// Called after a product is identified (by any source) to add ingredient
// safety data, INCI names, and allergen flags.
//
// TO ACTIVATE:
//   1. Get API access at cosmethics.com (contact their B2B team)
//   2. Add COSMETHICS_API_KEY to .env.local and Vercel env vars
//   3. Fill in the endpoint and response shape below based on their docs

export interface CosmethicsData {
  ingredients:  { name: string; inci: string; rating: number | null }[]
  allergens:    string[]
  safety_score: number | null
}

export async function enrichWithCosmethics(
  productName: string,
  brand: string
): Promise<CosmethicsData | null> {
  const apiKey = process.env.COSMETHICS_API_KEY
  if (!apiKey) return null // silently skip until configured

  try {
    // TODO: replace with actual Cosmethics endpoint + response shape
    // const res = await fetch(`https://api.cosmethics.com/v1/search?q=...`, {
    //   headers: { Authorization: `Bearer ${apiKey}` },
    //   signal: AbortSignal.timeout(8000),
    // })
    // const data = await res.json()
    // return normalise(data)
    void productName; void brand
    return null
  } catch {
    return null
  }
}
