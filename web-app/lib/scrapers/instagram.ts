// Instagram scraper via Apify's instagram-hashtag-scraper actor.
// Instagram's official API does not expose hashtag search for this use case.
// Apify pricing: pay-per-result (~$0.25/1000).
//
// Required env: APIFY_API_TOKEN (same token as TikTok)

import type { ScraperAdapter, ScrapedPost } from './types'

const APIFY_BASE = 'https://api.apify.com/v2'
const INSTAGRAM_ACTOR = 'apify~instagram-hashtag-scraper'
const MAX_WAIT_MS = 90_000
const POLL_INTERVAL_MS = 5_000

function buildHashtags(brand: string): string[] {
  const clean = brand.toLowerCase().replace(/\s+/g, '')
  return [
    `fake${clean}`,
    `counterfeit${clean}`,
    `${clean}fake`,
    `${clean}dupe`,
  ]
}

async function pollRunStatus(runId: string, token: string): Promise<string | null> {
  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    try {
      const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`)
      const json = await res.json()
      const state: string = json.data?.status ?? ''
      if (state === 'SUCCEEDED') return json.data?.defaultDatasetId ?? null
      if (state === 'FAILED' || state === 'ABORTED' || state === 'TIMED-OUT') {
        console.warn(`[instagram] Apify run ${runId} ended: ${state}`)
        return null
      }
    } catch {
      // transient; keep polling
    }
  }
  return null
}

export const instagramScraper: ScraperAdapter = {
  name: 'instagram',

  async isAvailable(): Promise<boolean> {
    return typeof process.env.APIFY_API_TOKEN === 'string' &&
      process.env.APIFY_API_TOKEN.length > 0
  },

  async scrape(brand: string): Promise<ScrapedPost[]> {
    const token = process.env.APIFY_API_TOKEN
    if (!token) return []

    const runRes = await fetch(`${APIFY_BASE}/acts/${INSTAGRAM_ACTOR}/runs?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hashtags: buildHashtags(brand),
        resultsLimit: 30,
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!runRes.ok) {
      console.warn(`[instagram] Apify run start failed: ${runRes.status}`)
      return []
    }

    const runData = await runRes.json()
    const runId: string = runData.data?.id
    if (!runId) return []

    const datasetId = await pollRunStatus(runId, token)
    if (!datasetId) return []

    const itemsRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=100`,
      { signal: AbortSignal.timeout(12000) }
    )
    if (!itemsRes.ok) return []

    const items = (await itemsRes.json()) as Record<string, unknown>[]

    return items.map((item) => {
      const shortCode = item.shortCode as string | undefined
      const postUrl = item.url as string |undefined ??
        (shortCode ? `https://www.instagram.com/p/${shortCode}/` : '')

      const imageUrls: string[] = []
      if (item.imageUrl) imageUrls.push(item.imageUrl as string)
      if (Array.isArray(item.images)) imageUrls.push(...(item.images as string[]))

      return {
        platform:         'instagram' as const,
        post_url:         postUrl,
        content:          (item.caption ?? '') as string,
        image_urls:       imageUrls.filter(Boolean),
        engagement_score: ((item.likesCount as number) ?? 0) +
                          ((item.commentsCount as number) ?? 0),
        created_at:       (item.timestamp as string) ?? new Date().toISOString(),
      }
    })
  },
}
