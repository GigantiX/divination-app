'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CalendarBatch {
    id: string
    name: string
    startDate: string
    endDate: string | null
    notes: string | null
    event: {
        id: string
        name: string
        status: 'active' | 'completed' | 'upcoming'
    }
}

export async function getCalendarBatches(): Promise<CalendarBatch[]> {
    const session = await auth()
    if (!session?.user?.id) return []

    const supabase = createAdminClient()

    const { data, error } = await supabase
        .from('batches')
        .select(`
            id,
            name,
            start_date,
            end_date,
            notes,
            events:event_id (
                id,
                name,
                status
            )
        `)
        .order('start_date', { ascending: true })

    if (error || !data) {
        console.error('Error fetching calendar batches:', error)
        return []
    }

    return data.map((b: any) => ({
        id: b.id,
        name: b.name,
        startDate: b.start_date,
        endDate: b.end_date,
        notes: b.notes,
        event: {
            id: b.events?.id || '',
            name: b.events?.name || 'Unknown Event',
            status: b.events?.status || 'active'
        }
    }))
}
