// Generates product usage guidance (how to use, skin concerns, key ingredients)
// using Gemini, then saves to the products table so subsequent loads are instant.

import { GoogleGenAI } from '@google/genai'

function getGemini(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured')
  return new GoogleGenAI({ apiKey: key })
}

export interface ProductUsage {
  how_to_use:            string
  skin_type_suitability: string
  key_ingredients:       string[]
}

export async function generateProductUsage(
  name: string,
  brand: string,
  category: string,
): Promise<ProductUsage | null> {
  const prompt = `You are a skincare expert. Generate usage guidance for this product.

Product: ${name.slice(0, 120)}
Brand: ${brand.slice(0, 80)}
Category: ${category.slice(0, 80)}

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "how_to_use": "How to apply and how often. 1-2 sentences max.",
  "skin_type_suitability": "2-4 comma-separated skin concerns from: Acne, Oily Skin, Dry Skin, Sensitive Skin, Hyperpigmentation, Brightening, Anti-Ageing, Hydration, Uneven Skin Tone",
  "key_ingredients": ["up to 5 key active ingredients as short strings"]
}`

  try {
    const response = await getGemini().models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0.2 },
    })

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)

    const how_to_use = typeof parsed.how_to_use === 'string' ? parsed.how_to_use.trim().slice(0, 400) : ''
    const skin_type_suitability = typeof parsed.skin_type_suitability === 'string' ? parsed.skin_type_suitability.trim().slice(0, 200) : ''
    const key_ingredients = Array.isArray(parsed.key_ingredients)
      ? (parsed.key_ingredients as unknown[])
          .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
          .map((i) => i.trim().slice(0, 60))
          .slice(0, 5)
      : []

    if (!how_to_use && !skin_type_suitability && !key_ingredients.length) return null

    return { how_to_use, skin_type_suitability, key_ingredients }
  } catch {
    return null
  }
}
