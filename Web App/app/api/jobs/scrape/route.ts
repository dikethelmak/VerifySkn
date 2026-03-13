import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runScrapers } from '@/lib/scrapers/job-runner'
import { redditScraper } from '@/lib/scrapers/reddit'

const ADAPTERS = [redditScraper]

function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!secret || !expected) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // Fix 7: key checkpoint by date so crash recovery actually works across restarts
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const jobId = `scrape-${today}`
  const startedAt = new Date().toISOString()

  await supabase.from('scrape_jobs').upsert({
    id:         jobId,
    job_type:   'scrape',
    status:     'running',
    started_at: startedAt,
    metadata:   {},
  }, { onConflict: 'id' })

  try {
    // Load checkpoint — brands already processed today
    const { data: checkpoint } = await supabase
      .from('scrape_job_checkpoints')
      .select('completed_brands')
      .eq('job_id', jobId)
      .maybeSingle()

    const completedBrands: string[] = checkpoint?.completed_brands ?? []

    const { data: brands } = await supabase.from('brands').select('name')
    const allBrands = (brands ?? []).map((b: { name: string }) => b.name)
    const pendingBrands = allBrands.filter((b) => !completedBrands.includes(b))

    const allPosts: unknown[] = []
    const jobErrors: Record<string, string> = {}

    for (const brand of pendingBrands) {
      const result = await runScrapers(ADAPTERS, brand, '')

      if (result.posts.length > 0) {
        await supabase.from('social_intelligence_cache').insert(
          result.posts.map((post) => ({
            brand,
            platform:         post.platform,
            post_url:         post.post_url,
            content:          post.content,
            image_urls:       post.image_urls,
            engagement_score: post.engagement_score,
            posted_at:        post.created_at,
            processed:        false,
          }))
        )
      }

      allPosts.push(...result.posts)
      Object.assign(jobErrors, result.errors)

      completedBrands.push(brand)
      await supabase
        .from('scrape_job_checkpoints')
        .upsert({ job_id: jobId, completed_brands: completedBrands }, { onConflict: 'job_id' })
    }

    await supabase
      .from('scrape_jobs')
      .update({
        status:       'completed',
        completed_at: new Date().toISOString(),
        metadata:     { total_posts: allPosts.length, brands_run: pendingBrands.length, errors: jobErrors },
      })
      .eq('id', jobId)

    return NextResponse.json({ jobId, brands_processed: pendingBrands.length, posts_found: allPosts.length, errors: jobErrors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('scrape_jobs')
      .update({ status: 'failed', metadata: { error: message } })
      .eq('id', jobId)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
