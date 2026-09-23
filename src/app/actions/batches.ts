'use server'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'
import { getEventAccess, isAdminOrDeveloper } from '@/lib/authorization'
import { getJakartaDateString } from '@/lib/date'

export interface BatchListItem {
    id: string
    name: string
    startDate: string
    endDate: string | null
    price: number
    notes: string | null
    createdAt: string
    sessions: BatchSession[]
}

export interface BatchSession {
    id: string
    name: string
}

export interface EventBatchListData {
    event: {
        id: string
        name: string
        logoUrl: string | null
        status: string
    }
    activeBatches: BatchListItem[]
    completedBatches: BatchListItem[]
    userRole: 'developer' | 'admin' | 'user'
    userEventRole: 'pic' | 'advertiser' | null
    canCreateBatch: boolean
    canEditBatch: boolean
    canDeleteBatch: boolean
}

export interface CreateBatchInput {
    eventId: string
    name: string
    startDate: string
    endDate?: string | null // Null = ongoing batch
    price?: number
    notes?: string
    sessions?: string[]
}

export interface BatchResult {
    success?: boolean
    error?: string
    batchId?: string
}

function isIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function validateSessionNames(sessions: unknown): { names: string[]; error?: string } {
    if (sessions === undefined) return { names: [] }
    if (!Array.isArray(sessions)) return { names: [], error: 'Daftar Kota/Sesi tidak valid' }
    if (sessions.length > 30) return { names: [], error: 'Maksimal 30 Kota/Sesi dalam satu batch' }

    const names: string[] = []
    const seen = new Set<string>()

    for (const session of sessions) {
        if (typeof session !== 'string') return { names: [], error: 'Nama Kota/Sesi tidak valid' }
        const name = session.trim().replace(/\s+/g, ' ')
        if (!name || name.length > 100) {
            return { names: [], error: 'Nama Kota/Sesi harus terdiri dari 1-100 karakter' }
        }

        const key = name.toLocaleLowerCase('id-ID')
        if (seen.has(key)) return { names: [], error: 'Kota/Sesi tidak boleh duplikat' }
        seen.add(key)
        names.push(name)
    }

    return { names }
}

/**
 * Get the batches for an event, grouped by their finish date in Jakarta time.
 * A batch remains active through its end date; a null end date is ongoing.
 */
export async function getEventBatches(eventId: string): Promise<EventBatchListData | null> {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const supabase = createAdminClient()
    const access = await getEventAccess(supabase, session.user.id, eventId)

    if (!access) {
        return null
    }

    const [eventResult, batchesResult] = await Promise.all([
        supabase
            .from('events')
            .select('id, name, logo_url, status')
            .eq('id', eventId)
            .single(),
        supabase
            .from('batches')
            .select('id, name, start_date, end_date, price, notes, created_at, batch_sessions(id, name)')
            .eq('event_id', eventId)
            .order('start_date', { ascending: false }),
    ])

    if (eventResult.error || !eventResult.data || batchesResult.error) {
        console.error('Error fetching event batches:', eventResult.error || batchesResult.error)
        return null
    }

    const today = getJakartaDateString()
    const batches: BatchListItem[] = (batchesResult.data || []).map((batch) => ({
        id: batch.id,
        name: batch.name,
        startDate: batch.start_date,
        endDate: batch.end_date,
        price: Number(batch.price || 0),
        notes: batch.notes,
        createdAt: batch.created_at,
        sessions: Array.isArray(batch.batch_sessions)
            ? batch.batch_sessions.map((session: BatchSession) => ({ id: session.id, name: session.name }))
            : [],
    }))

    const activeBatches = batches.filter((batch) => !batch.endDate || batch.endDate >= today)
    const completedBatches = batches.filter((batch) => batch.endDate !== null && batch.endDate < today)
    const canManageBatch = isAdminOrDeveloper(access.userRole) || access.eventRole === 'pic'

    return {
        event: {
            id: eventResult.data.id,
            name: eventResult.data.name,
            logoUrl: eventResult.data.logo_url,
            status: eventResult.data.status,
        },
        activeBatches,
        completedBatches,
        userRole: access.userRole,
        userEventRole: access.eventRole,
        canCreateBatch: canManageBatch,
        canEditBatch: canManageBatch,
        canDeleteBatch: isAdminOrDeveloper(access.userRole),
    }
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

    const access = await getEventAccess(supabase, session.user.id, input.eventId)
    if (!access || (!isAdminOrDeveloper(access.userRole) && access.eventRole !== 'pic')) {
        return { error: 'Tidak memiliki akses untuk menambahkan batch' }
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

    if (!input.startDate || !isIsoDate(input.startDate)) {
        return { error: 'Tanggal mulai wajib diisi' }
    }

    // Validate date range only if end date is provided
    if (input.endDate) {
        if (!isIsoDate(input.endDate) || input.endDate < input.startDate) {
            return { error: 'Tanggal selesai harus setelah tanggal mulai' }
        }
    }

    // Validate price
    if (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0)) {
        return { error: 'Harga tidak boleh negatif' }
    }

    const validatedSessions = validateSessionNames(input.sessions)
    if (validatedSessions.error) return { error: validatedSessions.error }

    // Create batch
    const { data: batch, error } = await supabase
        .from('batches')
        .insert({
            event_id: input.eventId,
            name: input.name.trim(),
            start_date: input.startDate,
            end_date: input.endDate || null, // Null for ongoing batches
            price: input.price ?? 0,
            notes: input.notes?.trim() || null,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error creating batch:', error)
        return { error: 'Gagal membuat batch. Silakan coba lagi.' }
    }

    if (validatedSessions.names.length > 0) {
        const { error: sessionError } = await supabase
            .from('batch_sessions')
            .insert(validatedSessions.names.map((name) => ({ batch_id: batch.id, name })))

        if (sessionError) {
            console.error('Error creating batch sessions:', sessionError)
            await supabase.from('batches').delete().eq('id', batch.id)
            return { error: 'Gagal menambahkan Kota/Sesi. Silakan coba lagi.' }
        }
    }

    // Revalidate event detail page
    revalidateTag(`event-${input.eventId}`, 'default')
    revalidateTag('dashboard', 'default')

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
            price,
            notes,
            event_id,
            created_at,
            batch_sessions(id, name)
        `)
        .eq('id', batchId)
        .single()

    if (error || !batch) {
        return null
    }

    const access = await getEventAccess(supabase, session.user.id, batch.event_id)
    if (!access) {
        return null
    }

    return {
        ...batch,
        sessions: Array.isArray(batch.batch_sessions)
            ? batch.batch_sessions.map((session: BatchSession) => ({ id: session.id, name: session.name }))
            : [],
    }
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
        .select('event_id, start_date, end_date, batch_sessions(id, name)')
        .eq('id', batchId)
        .single()

    if (!batch) {
        return { error: 'Batch tidak ditemukan' }
    }

    const access = await getEventAccess(supabase, session.user.id, batch.event_id)
    if (!access || (!isAdminOrDeveloper(access.userRole) && access.eventRole !== 'pic')) {
        return { error: 'Tidak memiliki akses' }
    }

    if (input.name !== undefined && (typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.trim().length > 100)) {
        return { error: 'Nama batch harus terdiri dari 1-100 karakter' }
    }
    if (input.startDate !== undefined && !isIsoDate(input.startDate)) {
        return { error: 'Tanggal mulai tidak valid' }
    }
    if (input.endDate !== undefined && input.endDate !== null && !isIsoDate(input.endDate)) {
        return { error: 'Tanggal selesai tidak valid' }
    }
    if (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0)) {
        return { error: 'Harga tidak boleh negatif' }
    }

    const validatedSessions = input.sessions === undefined ? undefined : validateSessionNames(input.sessions)
    if (validatedSessions?.error) return { error: validatedSessions.error }

    const startDate = input.startDate ?? batch.start_date
    const endDate = input.endDate === undefined ? batch.end_date : input.endDate
    if (endDate && endDate < startDate) {
        return { error: 'Tanggal selesai harus setelah tanggal mulai' }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.startDate !== undefined) updateData.start_date = input.startDate
    if (input.endDate !== undefined) updateData.end_date = input.endDate
    if (input.price !== undefined) updateData.price = input.price
    if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null

    const existingSessions: BatchSession[] = Array.isArray(batch.batch_sessions)
        ? batch.batch_sessions.map((session: BatchSession) => ({ id: session.id, name: session.name }))
        : []

    const desiredSessions = validatedSessions?.names
    const existingByName = new Map(existingSessions.map((session) => [session.name.toLocaleLowerCase('id-ID'), session]))
    const sessionsToCreate = desiredSessions?.filter((name) => !existingByName.has(name.toLocaleLowerCase('id-ID'))) ?? []
    const desiredNames = new Set((desiredSessions ?? []).map((name) => name.toLocaleLowerCase('id-ID')))
    const sessionsToDelete = desiredSessions === undefined
        ? []
        : existingSessions.filter((session) => !desiredNames.has(session.name.toLocaleLowerCase('id-ID')))

    if (sessionsToDelete.length > 0) {
        const { data: reportsUsingSession } = await supabase
            .from('reports')
            .select('id')
            .in('batch_session_id', sessionsToDelete.map((session) => session.id))
            .limit(1)

        if ((reportsUsingSession || []).length > 0) {
            return { error: 'Kota/Sesi yang sudah memiliki laporan tidak dapat dihapus. Pindahkan atau hapus laporannya terlebih dahulu.' }
        }
    }

    if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
            .from('batches')
            .update(updateData)
            .eq('id', batchId)

        if (error) {
            console.error('Error updating batch:', error)
            return { error: 'Gagal mengupdate batch' }
        }
    }

    if (sessionsToCreate.length > 0) {
        const { error } = await supabase
            .from('batch_sessions')
            .insert(sessionsToCreate.map((name) => ({ batch_id: batchId, name })))

        if (error) {
            console.error('Error adding batch sessions:', error)
            return { error: 'Gagal menambahkan Kota/Sesi' }
        }
    }

    if (sessionsToDelete.length > 0) {
        const { error } = await supabase
            .from('batch_sessions')
            .delete()
            .in('id', sessionsToDelete.map((session) => session.id))

        if (error) {
            console.error('Error removing batch sessions:', error)
            return { error: 'Gagal menghapus Kota/Sesi' }
        }
    }

    revalidateTag(`event-${batch.event_id}`, 'default')

    return { success: true, batchId }
}

/**
 * Delete batch (Admin/Developer only)
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

    const access = await getEventAccess(supabase, session.user.id, batch.event_id)
    if (!access || !isAdminOrDeveloper(access.userRole)) {
        return { error: 'Tidak memiliki akses' }
    }

    const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId)

    if (error) {
        console.error('Error deleting batch:', error)
        return { error: 'Gagal menghapus batch' }
    }

    revalidateTag(`event-${batch.event_id}`, 'default')
    revalidateTag('dashboard', 'default')

    return { success: true }
}
