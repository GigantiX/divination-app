'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getUserRole, isAdminOrDeveloper } from '@/lib/authorization'

export interface CalendarBatch {
    id: string
    name: string
    startDate: string
    endDate: string | null
    notes: string | null
    canAccess: boolean
    event: {
        id: string
        name: string
        status: 'active' | 'completed' | 'upcoming'
    }
}

export interface CalendarEvent {
    id: string
    name: string
    startDate: string       // DATE string "YYYY-MM-DD"
    endDate: string | null  // null = single day
    startTime: string | null // "HH:MM" or null (full day)
    endTime: string | null   // "HH:MM" or null
    location: string | null
    createdAt: string
}

export interface CreateCalendarEventInput {
    name: string
    startDate: string
    endDate?: string | null
    startTime?: string | null
    endTime?: string | null
    location?: string | null
}

export interface CalendarEventResult {
    success?: boolean
    error?: string
    event?: CalendarEvent
}

export async function getCalendarBatches(): Promise<CalendarBatch[]> {
    const session = await auth()
    if (!session?.user?.id) return []

    const supabase = createAdminClient()

    const role = await getUserRole(supabase, session.user.id)
    if (!role) return []

    let accessibleEventIds: Set<string> | null = null
    if (!isAdminOrDeveloper(role)) {
        const { data: assignments, error: assignmentsError } = await supabase
            .from('event_assignments')
            .select('event_id')
            .eq('user_id', session.user.id)

        if (assignmentsError) return []
        accessibleEventIds = new Set((assignments || []).map((assignment) => assignment.event_id))
    }

    const query = supabase
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

    const { data, error } = await query.order('start_date', { ascending: true })

    if (error || !data) {
        console.error('Error fetching calendar batches:', error)
        return []
    }

    return data.map((batch) => {
        const event = batch.events as unknown as CalendarBatch['event'] | null
        const eventId = event?.id || ''
        const canAccess = accessibleEventIds === null || accessibleEventIds.has(eventId)
        return {
            id: batch.id,
            name: batch.name,
            startDate: batch.start_date,
            endDate: batch.end_date,
            notes: canAccess ? batch.notes : null,
            canAccess,
            event: {
                id: eventId,
                name: event?.name || 'Unknown Event',
                status: event?.status || 'active',
            },
        }
    })
}

/**
 * Fetch all personal calendar events for the current user
 */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
    const session = await auth()
    if (!session?.user?.id) return []

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('calendar_events')
        .select('id, name, start_date, end_date, start_time, end_time, location, created_at')
        .eq('user_id', session.user.id)
        .order('start_date', { ascending: true })

    if (error || !data) {
        console.error('Error fetching calendar events:', error)
        return []
    }

    return data.map((e) => ({
        id: e.id,
        name: e.name,
        startDate: e.start_date,
        endDate: e.end_date ?? null,
        startTime: e.start_time ?? null,
        endTime: e.end_time ?? null,
        location: e.location ?? null,
        createdAt: e.created_at,
    }))
}

/**
 * Create a new personal calendar event
 */
export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<CalendarEventResult> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const name = input.name?.trim()
    if (!name || name.length < 1) {
        return { error: 'Nama acara tidak boleh kosong' }
    }
    if (name.length > 100) {
        return { error: 'Nama acara maksimal 100 karakter' }
    }
    if (!input.startDate) {
        return { error: 'Tanggal mulai wajib diisi' }
    }
    // Validate end_date >= start_date
    if (input.endDate && input.endDate < input.startDate) {
        return { error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('calendar_events')
        .insert({
            user_id: session.user.id,
            name,
            start_date: input.startDate,
            end_date: input.endDate ?? null,
            start_time: input.startTime ?? null,
            end_time: input.endTime ?? null,
            location: input.location?.trim() || null,
        })
        .select('id, name, start_date, end_date, start_time, end_time, location, created_at')
        .single()

    if (error || !data) {
        console.error('Error creating calendar event:', error)
        return { error: 'Gagal menyimpan acara. Silakan coba lagi.' }
    }

    revalidatePath('/apps/event-calendar')
    return {
        success: true,
        event: {
            id: data.id,
            name: data.name,
            startDate: data.start_date,
            endDate: data.end_date ?? null,
            startTime: data.start_time ?? null,
            endTime: data.end_time ?? null,
            location: data.location ?? null,
            createdAt: data.created_at,
        }
    }
}

/**
 * Delete a personal calendar event (owner only)
 */
export async function deleteCalendarEvent(id: string): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()
    const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id) // Guard: only owner

    if (error) {
        console.error('Error deleting calendar event:', error)
        return { error: 'Gagal menghapus acara.' }
    }

    revalidatePath('/apps/event-calendar')
    return { success: true }
}
