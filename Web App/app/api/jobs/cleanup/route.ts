import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ScanLog } from '@/lib/database.types'

function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!secret || !expected) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const jobId = crypto.randomUUID()
  const startedAt = new Date().toISOString()

  const now = new Date()
  const ninetyDaysAgo    = new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000).toISOString()
  const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const sixMonthsAgo     = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000).toISOString()

  const stats = {
    social_processed_deleted:   0,
    social_unprocessed_deleted: 0,
    scan_logs_archived:         0,
    scan_logs_deleted:          0,
  }

  // 1. Delete processed social_intelligence_cache rows > 90 days
  const { count: processedDeleted } = await supabase
    .from('social_intelligence_cache')
    .delete({ count: 'exact' })
    .eq('processed', true)
    .lt('created_at', ninetyDaysAgo)

  stats.social_processed_deleted = processedDeleted ?? 0

  // 2. Delete unprocessed social_intelligence_cache rows > 180 days
  const { count: unprocessedDeleted } = await supabase
    .from('social_intelligence_cache')
    .delete({ count: 'exact' })
    .eq('processed', false)
    .lt('created_at', oneEightyDaysAgo)

  stats.social_unprocessed_deleted = unprocessedDeleted ?? 0

  // 3. Archive scan_logs older than 6 months, then delete
  const { data: rawOldLogs } = await supabase
    .from('scan_logs')
    .select('*')
    .lt('scanned_at', sixMonthsAgo)

  const oldLogs = (rawOldLogs ?? []) as ScanLog[]

  if (oldLogs.length > 0) {
    const { error: archiveError } = await supabase
      .from('scan_logs_archive')
      .insert(oldLogs.map((row) => ({ ...row, archived_at: now.toISOString() })))

    if (!archiveError) {
      const ids = oldLogs.map((r) => r.id)
      const { count: deletedCount } = await supabase
        .from('scan_logs')
        .delete({ count: 'exact' })
        .in('id', ids)

      stats.scan_logs_archived = oldLogs.length
      stats.scan_logs_deleted  = deletedCount ?? 0
    } else {
      console.error('[cleanup] Archive insert failed, skipping scan_log delete:', archiveError)
    }
  }

  // 4. Log cleanup stats
  await supabase.from('scrape_jobs').insert({
    id:           jobId,
    job_type:     'cleanup',
    status:       'completed',
    started_at:   startedAt,
    completed_at: new Date().toISOString(),
    metadata:     stats,
  })

  return NextResponse.json({ jobId, ...stats })
}
