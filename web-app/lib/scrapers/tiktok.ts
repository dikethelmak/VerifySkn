// TikTok scraper via Apify's clockworks/tiktok-scraper actor.
// No usable official API for keyword/hashtag search at this use case.
// Apify pricing: ~$0.25 per 1000 results (pay-as-you-go).
//
// Required env: APIFY_API_TOKEN

import type { ScraperAdapter, ScrapedPost } from './types'

const APIFY_BASE = 'https://api.apify.com/v2'
const TIKTOK_ACTOR = 'clockworks~tiktok-scraper'
const MAX_WAIT_MS = 90_000
const POLL_INTERVAL_MS = 5_000

function buildHashtags(brand: string): string[] {
  const clean = brand.toLowerCase().replace(/\s+/g, '')
  return [
    `fake${clean}`,
    `counterfeit${clean}`,
    `${clean}fake`,
    `fake${clean}skincare`,
  ]
}

async function pollRunStatus(
  runId: string,
  token: string
): Promise<string | null> {
  const deadline = Date.now() + MAX_WAIT_MS
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    try {
      const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`)
      const json = await res.json()
      const state: string = json.data?.status ?? ''
      if (state === 'SUCCEEDED') return json.data?.defaultDatasetId ?? null
      if (state === 'FAILED' || state === 'ABORTED' || state === 'TIMED-OUT') {
        console.warn(`[tiktok] Apify run ${runId} ended with state: ${state}`)
        return null
      }
    } catch {
      // transient; keep polling
    }
  }
  console.warn(`[tiktok] Apify run ${runId} timed out after ${MAX_WAIT_MS}ms`)
  return null
}

export const tiktokScraper: ScraperAdapter = {
  name: 'tiktok',

  async isAvailable(): Promise<boolean> {
    return typeof process.env.APIFY_API_TOKEN === 'string' &&
      process.env.APIFY_API_TOKEN.length > 0
  },

  async scrape(brand: string): Promise<ScrapedPost[]> {
    const token = process.env.APIFY_API_TOKEN
    if (!token) return []

    // Start Apify actor run
    const runRes = await fetch(`${APIFY_BASE}/acts/${TIKTOK_ACTOR}/runs?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hashtags: buildHashtags(brand),
        resultsPerPage: 20,
        maxResults: 60,
        shouldDownloadVideos: false,
        shouldDownloadCovers: true,
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!runRes.ok) {
      console.warn(`[tiktok] Apify run start failed: ${runRes.status}`)
      return []
    }

    const runData = await runRes.json()
    const runId: string = runData.data?.id
    if (!runId) {
      console.warn('[tiktok] No runId returned from Apify')
      return []
    }

    const datasetId = await pollRunStatus(runId, token)
    if (!datasetId) return []

    const itemsRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=100`,
      { signal: AbortSignal.timeout(12000) }
    )
    if (!itemsRes.ok) return []

    const items = (await itemsRes.json()) as Record<string, unknown>[]

    return items.map((item) => ({
      platform:         'tiktok' as const,
      post_url:         (item.webVideoUrl ?? item.videoUrl ?? '') as string,
      content:          [
        item.text ?? '',
        ...((item.hashtags as string[]) ?? []),
      ].join(' '),
      image_urls:       ([item.coverUrl].filter(Boolean)) as string[],
      engagement_score: ((item.diggCount as number) ?? 0) +
                        ((item.shareCount as number) ?? 0),
      created_at:       (item.createTimeISO as string) ?? new Date().toISOString(),
    }))
  },
}
