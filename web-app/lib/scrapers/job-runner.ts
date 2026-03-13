import type { ScraperAdapter, ScrapedPost } from './types'
import { withRetry } from '../utils/retry'

export interface JobResult {
  brand: string
  posts: ScrapedPost[]
  skipped_adapters: string[]
  errors: Record<string, string>
}

export async function runScrapers(
  adapters: ScraperAdapter[],
  brand: string,
  product: string
): Promise<JobResult> {
  const posts: ScrapedPost[] = []
  const skipped_adapters: string[] = []
  const errors: Record<string, string> = {}

  await Promise.allSettled(
    adapters.map(async (adapter) => {
      const available = await withRetry(() => adapter.isAvailable(), 2, 1000)
      if (!available) {
        console.warn(`[job-runner] ${adapter.name} unavailable, skipping`)
        skipped_adapters.push(adapter.name)
        return
      }

      const result = await withRetry(
        () => adapter.scrape(brand, product),
        3,
        2000
      )

      if (result === null) {
        errors[adapter.name] = 'All retries failed'
        skipped_adapters.push(adapter.name)
        return
      }

      posts.push(...result)
    })
  )

  return { brand, posts, skipped_adapters, errors }
}
