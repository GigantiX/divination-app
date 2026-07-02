'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'

export interface CreateEventInput {
    name: string
    logo_url?: string | null
}

export interface EventResult {
    success?: boolean
    error?: string
    eventId?: string
}

/**
 * Create a new event (Admin/Developer only)
 */
export async function createEvent(input: CreateEventInput): Promise<EventResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Verify user is admin/developer
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return { error: 'Tidak memiliki akses untuk membuat event' }
    }

    // Validate input
    if (!input.name || input.name.trim().length < 2) {
        return { error: 'Nama event minimal 2 karakter' }
    }

    if (input.name.trim().length > 100) {
        return { error: 'Nama event maksimal 100 karakter' }
    }

    // Create event
    const { data: event, error } = await supabase
        .from('events')
        .insert({
            name: input.name.trim(),
            logo_url: input.logo_url || null,
            status: 'active',
            created_by: session.user.id,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error creating event:', error)
        return { error: 'Gagal membuat event. Silakan coba lagi.' }
    }

    // Revalidate dashboard to show new event
    revalidateTag('dashboard', 'default')
    // Redirect, etc. is handled client-side
    return { success: true, eventId: event.id }
}

/**
 * Get single event by ID
 */
export async function getEvent(eventId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()

    const { data: event, error } = await supabase
        .from('events')
        .select(`
            id,
            name,
            logo_url,
            status,
            created_by,
            created_at
        `)
        .eq('id', eventId)
        .single()

    if (error || !event) {
        console.error('Error fetching event:', error)
        return null
    }

    return event
}

/**
 * Update event (Admin/Developer only)
 */
export async function updateEvent(eventId: string, input: Partial<CreateEventInput>): Promise<EventResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Verify user is admin/developer
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return { error: 'Tidak memiliki akses' }
    }

    // Validate name if provided
    if (input.name !== undefined) {
        if (input.name.trim().length < 2) {
            return { error: 'Nama event minimal 2 karakter' }
        }
        if (input.name.trim().length > 100) {
            return { error: 'Nama event maksimal 100 karakter' }
        }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.logo_url !== undefined) updateData.logo_url = input.logo_url

    const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId)

    if (error) {
        console.error('Error updating event:', error)
        return { error: 'Gagal mengupdate event' }
    }

    revalidateTag('dashboard', 'default')
    revalidateTag(`event-${eventId}`, 'default')

    return { success: true, eventId }
}

/**
 * Delete event (Admin/Developer only)
 */
export async function deleteEvent(eventId: string): Promise<EventResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Verify user is admin/developer
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return { error: 'Tidak memiliki akses' }
    }

    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

    if (error) {
        console.error('Error deleting event:', error)
        return { error: 'Gagal menghapus event' }
    }

    revalidateTag('dashboard', 'default')

    return { success: true }
}
