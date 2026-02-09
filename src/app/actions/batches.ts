'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface CreateBatchInput {
    eventId: string
    name: string
    startDate: string
    endDate?: string | null // Null = ongoing batch
    notes?: string
}

export interface BatchResult {
    success?: boolean
    error?: string
    batchId?: string
}

/**
 * Create a new batch for an event (Admin/Developer/PIC only)
 */
export async function createBatch(input: CreateBatchInput): Promise<BatchResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Get user profile and check permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = profile.role === 'admin' || profile.role === 'developer'

    // If not admin/dev, check if user is PIC for this event
    if (!isAdminOrDev) {
        const { data: assignment } = await supabase
            .from('event_assignments')
            .select('role')
            .eq('event_id', input.eventId)
            .eq('user_id', session.user.id)
            .single()

        if (!assignment || assignment.role !== 'pic') {
            return { error: 'Tidak memiliki akses untuk menambahkan batch' }
        }
    }

    // Validate event exists
    const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('id', input.eventId)
        .single()

    if (!event) {
        return { error: 'Event tidak ditemukan' }
    }

    // Validate input
    if (!input.name || input.name.trim().length < 1) {
        return { error: 'Nama batch wajib diisi' }
    }

    if (input.name.trim().length > 100) {
        return { error: 'Nama batch maksimal 100 karakter' }
    }

    if (!input.startDate) {
        return { error: 'Tanggal mulai wajib diisi' }
    }

    // Validate date range only if end date is provided
    if (input.endDate) {
        const startDate = new Date(input.startDate)
        const endDate = new Date(input.endDate)

        if (endDate < startDate) {
            return { error: 'Tanggal selesai harus setelah tanggal mulai' }
        }
    }

    // Create batch
    const { data: batch, error } = await supabase
        .from('batches')
        .insert({
            event_id: input.eventId,
            name: input.name.trim(),
            start_date: input.startDate,
            end_date: input.endDate || null, // Null for ongoing batches
            notes: input.notes?.trim() || null,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error creating batch:', error)
        return { error: 'Gagal membuat batch. Silakan coba lagi.' }
    }

    // Revalidate event detail page
    revalidatePath(`/events/${input.eventId}`)

    return { success: true, batchId: batch.id }
}

/**
 * Get batch by ID
 */
export async function getBatch(batchId: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()

    const { data: batch, error } = await supabase
        .from('batches')
        .select(`
            id,
            name,
            start_date,
            end_date,
            notes,
            event_id,
            created_at
        `)
        .eq('id', batchId)
        .single()

    if (error || !batch) {
        return null
    }

    return batch
}

/**
 * Update batch (Admin/Developer/PIC only)
 */
export async function updateBatch(
    batchId: string,
    input: Partial<Omit<CreateBatchInput, 'eventId'>>
): Promise<BatchResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Get batch to find event_id
    const { data: batch } = await supabase
        .from('batches')
        .select('event_id')
        .eq('id', batchId)
        .single()

    if (!batch) {
        return { error: 'Batch tidak ditemukan' }
    }

    // Check permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = profile.role === 'admin' || profile.role === 'developer'

    if (!isAdminOrDev) {
        const { data: assignment } = await supabase
            .from('event_assignments')
            .select('role')
            .eq('event_id', batch.event_id)
            .eq('user_id', session.user.id)
            .single()

        if (!assignment || assignment.role !== 'pic') {
            return { error: 'Tidak memiliki akses' }
        }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.startDate !== undefined) updateData.start_date = input.startDate
    if (input.endDate !== undefined) updateData.end_date = input.endDate
    if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null

    const { error } = await supabase
        .from('batches')
        .update(updateData)
        .eq('id', batchId)

    if (error) {
        console.error('Error updating batch:', error)
        return { error: 'Gagal mengupdate batch' }
    }

    revalidatePath(`/events/${batch.event_id}`)

    return { success: true, batchId }
}

/**
 * Delete batch (Admin/Developer/PIC only)
 */
export async function deleteBatch(batchId: string): Promise<BatchResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: 'Tidak terautentikasi' }
    }

    const supabase = createAdminClient()

    // Get batch to find event_id
    const { data: batch } = await supabase
        .from('batches')
        .select('event_id')
        .eq('id', batchId)
        .single()

    if (!batch) {
        return { error: 'Batch tidak ditemukan' }
    }

    // Check permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile) {
        return { error: 'Profil tidak ditemukan' }
    }

    const isAdminOrDev = profile.role === 'admin' || profile.role === 'developer'

    if (!isAdminOrDev) {
        const { data: assignment } = await supabase
            .from('event_assignments')
            .select('role')
            .eq('event_id', batch.event_id)
            .eq('user_id', session.user.id)
            .single()

        if (!assignment || assignment.role !== 'pic') {
            return { error: 'Tidak memiliki akses' }
        }
    }

    const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId)

    if (error) {
        console.error('Error deleting batch:', error)
        return { error: 'Gagal menghapus batch' }
    }

    revalidatePath(`/events/${batch.event_id}`)

    return { success: true }
}
