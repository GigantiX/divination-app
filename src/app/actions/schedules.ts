'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { documentSummary, duplicateDocument } from '@/lib/schedules/model'
import { UUID_PATTERN, validateScheduleDocument } from '@/lib/schedules/validation'
import type { ScheduleDocument, ScheduleEvent, ScheduleRecord, ScheduleResult, ScheduleStatus, ScheduleSummary } from '@/lib/schedules/types'

const BASE = 'id,event_id,name,status,version,published_version,published_at,updated_at'
const DETAIL = `${BASE},draft_document,published_document`
const SUMMARY = `${BASE},city_count,session_count,city_names`
const DATABASE_ERROR = 'Gagal mengakses schedule. Silakan coba lagi.'
const NOT_FOUND = 'Schedule tidak ditemukan.'
type Client = ReturnType<typeof createAdminClient>
type Actor = { db: Client; userId: string }
type Row = {
    id: string; event_id: string; name: string; status: ScheduleStatus; version: number
    published_version: number | null; published_at: string | null; updated_at: string
    draft_document?: ScheduleDocument; published_document?: ScheduleDocument | null
    city_count?: number; session_count?: number; city_names?: string[]
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

/** Every account can create schedules. Event assignments and role do not confer ownership. */
async function scheduleActor(): Promise<ScheduleResult<Actor>> {
    const session = await auth()
    if (!session?.user?.id) return fail('Tidak terautentikasi.')
    const db = createAdminClient()
    const { data, error } = await db.from('profiles').select('id').eq('id', session.user.id).maybeSingle()
    if (error) return fail(DATABASE_ERROR)
    if (!data) return fail('Profil tidak ditemukan.')
    return { success: true, data: { db, userId: session.user.id } }
}

function findOwnedSchedule(actor: Actor, id: string) {
    return actor.db.from('seminar_schedules').select(DETAIL).eq('id', id).eq('created_by', actor.userId).maybeSingle()
}

export async function getScheduleOverview(): Promise<ScheduleResult<{ events: ScheduleEvent[]; schedules: ScheduleSummary[] }>> {
    const actor = await scheduleActor()
    if (!actor.success) return fail(actor.error)
    const { db, userId } = actor.data
    // This catalog deliberately exposes only event identity, never event reports or assignments.
    const events: ScheduleEvent[] = []
    for (let offset = 0; ; offset += 500) {
        const { data, error } = await db.from('events').select('id,name,logo_url').order('name').order('id').range(offset, offset + 499)
        if (error) return fail(DATABASE_ERROR)
        events.push(...(data || []).map(item => ({ id: item.id, name: item.name, logoUrl: item.logo_url, canManage: true })))
        if (!data || data.length < 500) break
    }
    const rows: Row[] = []
    for (let offset = 0; ; offset += 500) {
        const { data, error } = await db.from('seminar_schedules').select(SUMMARY)
            .eq('created_by', userId).order('updated_at', { ascending: false }).order('id').range(offset, offset + 499)
        if (error) return fail(databaseMessage(error))
        rows.push(...(data || []) as Row[])
        if (!data || data.length < 500) break
    }
    return { success: true, data: { events, schedules: rows.map(row => ({
        id: row.id, eventId: row.event_id, name: row.name, status: row.status, version: row.version,
        publishedVersion: row.published_version, publishedAt: row.published_at, updatedAt: row.updated_at,
        cityCount: row.city_count || 0, sessionCount: row.session_count || 0, cityNames: row.city_names || [],
    })) } }
}

export async function getSchedule(id: string): Promise<ScheduleResult<{ schedule: ScheduleRecord; canManage: boolean; eventName: string }>> {
    const actor = await scheduleActor()
    if (!actor.success) return fail(actor.error)
    if (!UUID_PATTERN.test(id)) return fail(NOT_FOUND)
    const { data, error } = await findOwnedSchedule(actor.data, id)
    if (error) return fail(databaseMessage(error))
    if (!data) return fail(NOT_FOUND)
    const { data: event } = await actor.data.db.from('events').select('name').eq('id', data.event_id).maybeSingle()
    return { success: true, data: { schedule: record(data as Row), canManage: true, eventName: event?.name || 'Event' } }
}

export async function saveSchedule(input: {
    id?: string; eventId: string; name: string; document: unknown; version?: number; publish: boolean
}): Promise<ScheduleResult<ScheduleRecord>> {
    if (!input || typeof input !== 'object') return fail('Data schedule tidak valid.')
    const actor = await scheduleActor()
    if (!actor.success) return fail(actor.error)
    if (!UUID_PATTERN.test(input.eventId)) return fail('Event tidak valid.')
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!name || name.length > 120) return fail('Nama schedule wajib diisi, maksimal 120 karakter.')
    if (typeof input.publish !== 'boolean') return fail('Pilihan publikasi tidak valid.')
    let document: ScheduleDocument
    try { document = validateScheduleDocument(input.document, input.publish) }
    catch (error) { return fail(error instanceof Error ? error.message : 'Data schedule tidak valid.') }
    const { db, userId } = actor.data
    let previous: Row | null = null
    if (input.id) {
        if (!UUID_PATTERN.test(input.id)) return fail(NOT_FOUND)
        const found = await findOwnedSchedule(actor.data, input.id)
        if (found.error) return fail(databaseMessage(found.error))
        previous = found.data as Row | null
        if (!previous || previous.event_id !== input.eventId) return fail(NOT_FOUND)
        if (previous.status === 'archived') return fail('Pulihkan schedule dari arsip sebelum mengedit.')
        if (input.version !== previous.version) return fail('Schedule telah berubah di tab lain. Muat ulang sebelum menyimpan.')
    } else {
        const { data: event, error } = await db.from('events').select('id').eq('id', input.eventId).maybeSingle()
        if (error) return fail(DATABASE_ERROR)
        if (!event) return fail('Event tidak ditemukan.')
    }
    const version = (previous?.version || 0) + 1
    const mutation = {
        name, draft_document: document, ...documentSummary(document), version, updated_by: userId,
        ...(input.publish ? { status: 'published', published_document: document, published_version: version, published_at: new Date().toISOString() } : {}),
    }
    const result = previous
        ? await db.from('seminar_schedules').update(mutation).eq('id', previous.id).eq('created_by', userId)
            .eq('event_id', input.eventId).eq('version', input.version).select(DETAIL).maybeSingle()
        : await db.from('seminar_schedules').insert({ ...mutation, event_id: input.eventId, created_by: userId }).select(DETAIL).single()
    if (result.error) return fail(databaseMessage(result.error))
    if (!result.data) return fail('Schedule telah berubah di tab lain. Muat ulang sebelum menyimpan.')
    revalidatePath('/apps/schedule-manager', 'layout')
    return { success: true, data: record(result.data as Row) }
}

export async function duplicateSchedule(id: string): Promise<ScheduleResult<ScheduleRecord>> {
    const original = await getSchedule(id)
    if (!original.success) return fail(original.error)
    const source = original.data.schedule
    return saveSchedule({ eventId: source.eventId, name: `${source.name.slice(0, 110)} (Salinan)`, document: duplicateDocument(source.document), publish: false })
}

export async function changeScheduleStatus(id: string, version: number, action: 'archive' | 'restore' | 'unpublish'): Promise<ScheduleResult<ScheduleRecord>> {
    if (!['archive', 'restore', 'unpublish'].includes(action) || !Number.isInteger(version)) return fail('Aksi schedule tidak valid.')
    const actor = await scheduleActor()
    if (!actor.success) return fail(actor.error)
    if (!UUID_PATTERN.test(id)) return fail(NOT_FOUND)
    const found = await findOwnedSchedule(actor.data, id)
    if (found.error) return fail(databaseMessage(found.error))
    if (!found.data) return fail(NOT_FOUND)
    if (found.data.version !== version) return fail('Schedule telah berubah. Muat ulang halaman.')
    const { data, error } = await actor.data.db.from('seminar_schedules').update({
        status: action === 'archive' ? 'archived' : 'draft', published_document: null, published_version: null,
        published_at: null, version: version + 1, updated_by: actor.data.userId,
    }).eq('id', id).eq('created_by', actor.data.userId).eq('version', version).select(DETAIL).maybeSingle()
    if (error) return fail(databaseMessage(error))
    if (!data) return fail('Schedule telah berubah. Muat ulang halaman.')
    revalidatePath('/apps/schedule-manager', 'layout')
    return { success: true, data: record(data as Row) }
}

export async function deleteSchedule(id: string, version: number): Promise<ScheduleResult<{ id: string }>> {
    const actor = await scheduleActor()
    if (!actor.success) return fail(actor.error)
    if (!UUID_PATTERN.test(id) || !Number.isInteger(version) || version < 1) return fail('Schedule tidak valid.')
    const { data, error } = await actor.data.db.from('seminar_schedules').delete()
        .eq('id', id).eq('created_by', actor.data.userId).eq('version', version).select('id').maybeSingle()
    if (error) return fail(databaseMessage(error))
    if (!data) return fail('Schedule tidak ditemukan atau telah berubah. Muat ulang halaman.')
    revalidatePath('/apps/schedule-manager', 'layout')
    return { success: true, data: { id: data.id } }
}
