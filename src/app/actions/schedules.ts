'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { getEventAccess, getUserRole, isAdminOrDeveloper } from '@/lib/authorization'
import { createAdminClient } from '@/lib/supabase/admin'
import { documentSummary, duplicateDocument } from '@/lib/schedules/model'
import { UUID_PATTERN, validateScheduleDocument } from '@/lib/schedules/validation'
import type { ScheduleDocument, ScheduleEvent, ScheduleRecord, ScheduleResult, ScheduleStatus, ScheduleSummary } from '@/lib/schedules/types'

const BASE = 'id,event_id,name,status,version,published_version,published_at,updated_at'
const DETAIL = `${BASE},draft_document,published_document`
const SUMMARY = `${BASE},city_count,session_count,city_names`
const DATABASE_ERROR = 'Gagal mengakses schedule. Silakan coba lagi.'
type Client = ReturnType<typeof createAdminClient>
type Row = {
    id: string; event_id: string; name: string; status: ScheduleStatus; version: number
    published_version: number | null; published_at: string | null; updated_at: string
    draft_document?: ScheduleDocument; published_document?: ScheduleDocument | null; city_count?: number; session_count?: number; city_names?: string[]
}

function record(row: Row): ScheduleRecord {
    return {
        id: row.id, eventId: row.event_id, name: row.name, status: row.status,
        document: row.draft_document!, version: row.version, publishedVersion: row.published_version,
        publishedAt: row.published_at, updatedAt: row.updated_at,
        publishedCities: row.published_document?.cities.map(city => ({ id: city.id, name: city.name })) || [],
    }
}

function fail<T>(error: string): ScheduleResult<T> { return { success: false, error } }
function databaseMessage(error: { code?: string } | null): string {
    return error?.code === '42P01' || error?.code === 'PGRST205'
        ? 'Schedule Manager belum siap. Hubungi admin untuk menyiapkan database.' : DATABASE_ERROR
}

async function eventActor(eventId: string, manage: boolean): Promise<{ error: string } | { db: Client; userId: string; canManage: boolean }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Tidak terautentikasi.' } as const
    if (!UUID_PATTERN.test(eventId)) return { error: 'Event tidak valid.' } as const
    const db = createAdminClient()
    const access = await getEventAccess(db, session.user.id, eventId)
    const canManage = access && (isAdminOrDeveloper(access.userRole) || access.eventRole === 'pic')
    if (!access || (manage && !canManage)) return { error: 'Anda tidak memiliki akses untuk mengelola schedule event ini.' } as const
    return { db, userId: session.user.id, canManage: !!canManage }
}

async function findSchedule(db: Client, id: string) {
    return db.from('seminar_schedules').select(DETAIL).eq('id', id).maybeSingle()
}

/** All list reads are scoped before data leaves the server, using fresh roles. */
export async function getScheduleOverview(): Promise<ScheduleResult<{ events: ScheduleEvent[]; schedules: ScheduleSummary[] }>> {
    const session = await auth()
    if (!session?.user?.id) return fail('Tidak terautentikasi.')
    const db = createAdminClient()
    const role = await getUserRole(db, session.user.id)
    if (!role) return fail('Profil tidak ditemukan.')
    const allEvents = isAdminOrDeveloper(role)
    const assignments = new Map<string, string>()
    if (!allEvents) {
        const { data, error } = await db.from('event_assignments').select('event_id,role').eq('user_id', session.user.id)
        if (error) return fail(DATABASE_ERROR)
        for (const item of data || []) assignments.set(item.event_id, item.role)
        if (!assignments.size) return { success: true, data: { events: [], schedules: [] } }
    }
    let eventQuery = db.from('events').select('id,name,logo_url').order('name')
    if (!allEvents) eventQuery = eventQuery.in('id', [...assignments.keys()])
    const { data: eventRows, error: eventError } = await eventQuery
    if (eventError) return fail(DATABASE_ERROR)
    const events: ScheduleEvent[] = (eventRows || []).map(item => ({ id: item.id, name: item.name, logoUrl: item.logo_url, canManage: allEvents || assignments.get(item.id) === 'pic' }))
    if (!events.length) return { success: true, data: { events, schedules: [] } }
    // Page explicitly so counts do not silently stop at PostgREST's row limit.
    const rows: Row[] = []
    for (let offset = 0; ; offset += 500) {
        const { data, error } = await db.from('seminar_schedules').select(SUMMARY).in('event_id', events.map(event => event.id)).order('updated_at', { ascending: false }).order('id').range(offset, offset + 499)
        if (error) return fail(databaseMessage(error))
        rows.push(...(data || []) as Row[])
        if (!data || data.length < 500) break
    }
    return {
        success: true,
        data: { events, schedules: rows.map(row => ({
            id: row.id, eventId: row.event_id, name: row.name, status: row.status, version: row.version,
            publishedVersion: row.published_version, publishedAt: row.published_at, updatedAt: row.updated_at,
            cityCount: row.city_count || 0, sessionCount: row.session_count || 0, cityNames: row.city_names || [],
        })) },
    }
}

export async function getSchedule(id: string): Promise<ScheduleResult<{ schedule: ScheduleRecord; canManage: boolean; eventName: string }>> {
    const session = await auth()
    if (!session?.user?.id) return fail('Tidak terautentikasi.')
    if (!UUID_PATTERN.test(id)) return fail('Schedule tidak ditemukan.')
    const db = createAdminClient()
    const { data, error } = await findSchedule(db, id)
    if (error) return fail(databaseMessage(error))
    if (!data) return fail('Schedule tidak ditemukan.')
    const actor = await eventActor(data.event_id, false)
    if ('error' in actor) return fail(actor.error)
    const { data: event } = await db.from('events').select('name').eq('id', data.event_id).maybeSingle()
    return { success: true, data: { schedule: record(data as Row), canManage: actor.canManage, eventName: event?.name || 'Event' } }
}

export async function saveSchedule(input: {
    id?: string; eventId: string; name: string; document: unknown; version?: number; publish: boolean
}): Promise<ScheduleResult<ScheduleRecord>> {
    if (!input || typeof input !== 'object') return fail('Data schedule tidak valid.')
    const actor = await eventActor(input.eventId, true)
    if ('error' in actor) return fail(actor.error)
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!name || name.length > 120) return fail('Nama schedule wajib diisi, maksimal 120 karakter.')
    if (typeof input.publish !== 'boolean') return fail('Pilihan publikasi tidak valid.')
    let document: ScheduleDocument
    try { document = validateScheduleDocument(input.document, input.publish) }
    catch (error) { return fail(error instanceof Error ? error.message : 'Data schedule tidak valid.') }
    const { db, userId } = actor
    let previous: Row | null = null
    if (input.id) {
        if (!UUID_PATTERN.test(input.id)) return fail('ID schedule tidak valid.')
        const found = await findSchedule(db, input.id)
        if (found.error) return fail(databaseMessage(found.error))
        previous = found.data as Row | null
        if (!previous || previous.event_id !== input.eventId) return fail('Schedule tidak ditemukan pada event ini.')
        if (previous.status === 'archived') return fail('Pulihkan schedule dari arsip sebelum mengedit.')
        if (input.version !== previous.version) return fail('Schedule telah berubah di tab lain. Muat ulang sebelum menyimpan.')
    }
    const version = (previous?.version || 0) + 1
    const mutation = {
        name, draft_document: document, ...documentSummary(document), version, updated_by: userId,
        ...(input.publish ? { status: 'published', published_document: document, published_version: version, published_at: new Date().toISOString() } : {}),
    }
    const result = previous
        ? await db.from('seminar_schedules').update(mutation).eq('id', previous.id).eq('event_id', input.eventId).eq('version', input.version).select(DETAIL).maybeSingle()
        : await db.from('seminar_schedules').insert({ ...mutation, event_id: input.eventId, created_by: userId }).select(DETAIL).single()
    if (result.error) return fail(databaseMessage(result.error))
    if (!result.data) return fail('Schedule telah berubah di tab lain. Muat ulang sebelum menyimpan.')
    revalidatePath('/apps/schedule-manager', 'layout')
    return { success: true, data: record(result.data as Row) }
}

export async function duplicateSchedule(id: string): Promise<ScheduleResult<ScheduleRecord>> {
    const original = await getSchedule(id)
    if (!original.success) return fail(original.error)
    if (!original.data.canManage) return fail('Anda tidak memiliki akses untuk menduplikasi schedule.')
    const source = original.data.schedule
    return saveSchedule({ eventId: source.eventId, name: `${source.name.slice(0, 110)} (Salinan)`, document: duplicateDocument(source.document), publish: false })
}

export async function changeScheduleStatus(id: string, version: number, action: 'archive' | 'restore' | 'unpublish'): Promise<ScheduleResult<ScheduleRecord>> {
    if (!['archive', 'restore', 'unpublish'].includes(action) || !Number.isInteger(version)) return fail('Aksi schedule tidak valid.')
    const found = await getSchedule(id)
    if (!found.success) return fail(found.error)
    const actor = await eventActor(found.data.schedule.eventId, true)
    if ('error' in actor) return fail(actor.error)
    if (found.data.schedule.version !== version) return fail('Schedule telah berubah. Muat ulang halaman.')
    const { data, error } = await actor.db.from('seminar_schedules').update({
        status: action === 'archive' ? 'archived' : 'draft', published_document: null, published_version: null,
        published_at: null, version: version + 1, updated_by: actor.userId,
    }).eq('id', id).eq('version', version).select(DETAIL).maybeSingle()
    if (error) return fail(databaseMessage(error))
    if (!data) return fail('Schedule telah berubah. Muat ulang halaman.')
    revalidatePath('/apps/schedule-manager', 'layout')
    return { success: true, data: record(data as Row) }
}
