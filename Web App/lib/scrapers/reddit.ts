import Snoowrap from 'snoowrap'
import type { ScraperAdapter, ScrapedPost } from './types'

const SUBREDDITS = [
  'SkincareAddiction',
  'BeautyGuides',
  'Sephora',
  'AsianBeauty',
  'muacjdiscussion',
  'Ulta',
]

function buildClient(): Snoowrap {
  return new Snoowrap({
    userAgent: 'VerifySkn/1.0',
    clientId:     process.env.REDDIT_CLIENT_ID!,
    clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    username:     process.env.REDDIT_USERNAME!,
    password:     process.env.REDDIT_PASSWORD!,
  })
}

export const redditScraper: ScraperAdapter = {
  name: 'reddit',

  // Fix 11: cheap HTTP ping instead of a full Snoowrap fetch
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('https://www.reddit.com/api/v1/me.json', {
        headers: { 'User-Agent': 'VerifySkn/1.0' },
        signal: AbortSignal.timeout(3000),
      })
      // 200 (logged out), 401 (no auth), 403 — all mean Reddit is reachable
      return res.status === 200 || res.status === 401 || res.status === 403
    } catch {
      return false
    }
  },

  async scrape(brand: string, product: string): Promise<ScrapedPost[]> {
    const r = buildClient()
    const query = `fake ${brand} ${product} counterfeit dupe`
    const posts: ScrapedPost[] = []

    for (const sub of SUBREDDITS) {
      try {
        const results = await r.getSubreddit(sub).search({
          query,
          sort: 'top',
          time: 'year',
          limit: 10,
        })

        for (const post of results) {
          const imageUrls: string[] = []
          if (post.url?.match(/\.(jpg|jpeg|png|webp)/i)) {
            imageUrls.push(post.url)
          }

          const comments = await post.comments.fetchMore({ amount: 10 })
          const commentText = (comments as { body?: string }[])
            .map((c) => c.body)
            .filter(Boolean)
            .join('\n')

          posts.push({
            platform:         'reddit',
            post_url:         `https://reddit.com${post.permalink}`,
            content:          `${post.title}\n${post.selftext}\n\nComments:\n${commentText}`,
            image_urls:       imageUrls,
            engagement_score: post.score,
            created_at:       new Date(post.created_utc * 1000).toISOString(),
          })
        }
      } catch (err) {
        console.warn(`[reddit] Failed to search r/${sub}:`, err)
      }
    }

    return posts
  },
}
