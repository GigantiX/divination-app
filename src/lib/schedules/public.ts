import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { UUID_PATTERN } from './validation'
import type { ScheduleDocument } from './types'

/** Never read draft_document, event metadata, or staff identities on the public path. */
export async function getPublicSchedule(id: string): Promise<{ id: string; document: ScheduleDocument; publishedAt: string } | null> {
    if (!UUID_PATTERN.test(id)) return null
    const { data, error } = await createAdminClient().from('seminar_schedules')
        .select('id,published_document,published_at').eq('id', id).eq('status', 'published').maybeSingle()
    if (error) throw new Error('Public schedule unavailable')
    if (!data?.published_document || data.published_document.schemaVersion !== 1) return null
    return { id: data.id, document: data.published_document as ScheduleDocument, publishedAt: data.published_at }
}
