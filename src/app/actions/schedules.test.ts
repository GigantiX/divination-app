import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@/auth'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import { newScheduleDocument } from '@/lib/schedules/model'
import { changeScheduleStatus, duplicateSchedule, getSchedule, getScheduleOverview, saveSchedule } from './schedules'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
const EVENT = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const ID = '33333333-3333-4333-8333-333333333333'
const ACTOR = '44444444-4444-4444-8444-444444444444'

function document() {
    const doc = newScheduleDocument(); doc.cities[0].name = 'Malang'
    Object.assign(doc.cities[0].sessions[0], { date: '2026-11-07', time: '14:00', venue: 'Hotel Malang', checkoutUrl: 'https://example.orderonline.id/malang' })
    return doc
}
function row(changes: Record<string, unknown> = {}) {
    return { id: ID, event_id: EVENT, name: 'November', status: 'draft', draft_document: document(), version: 1, published_version: null, published_at: null, updated_at: '2026-10-31T00:00:00Z', city_count: 1, session_count: 1, city_names: ['Malang'], ...changes }
}
function database(builders: MockQueryBuilder[] = [], role = 'admin', assignment: string | null = null) {
    const queue = [...builders]
    vi.mocked(mockSupabaseClient.from).mockImplementation(table => {
        if (table === 'profiles') return new MockQueryBuilder({ role })
        if (table === 'event_assignments') return new MockQueryBuilder(assignment ? { role: assignment } : null)
        if (table === 'events') return new MockQueryBuilder([{ id: EVENT, name: 'Seminar Properti', logo_url: null }])
        if (table === 'seminar_schedules') return queue.shift() || new MockQueryBuilder(null)
        throw new Error('Unexpected table: ' + table)
    })
}
beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: ACTOR, role: 'admin' } } as never)
    database()
})

describe('Schedule Manager authorization', () => {
    it('rejects unauthenticated entry points without database reads', async () => {
        vi.mocked(auth).mockResolvedValue(null as never)
        const result = await Promise.all([getScheduleOverview(), getSchedule(ID), saveSchedule({ eventId: EVENT, name: 'Name', document: document(), publish: false }), duplicateSchedule(ID), changeScheduleStatus(ID, 1, 'archive')])
        expect(result.every(item => !item.success)).toBe(true)
        expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })
    it.each([null, 'advertiser'])('uses fresh roles and denies writes to users without PIC access (%s)', async assignment => {
        database([], 'user', assignment)
        expect(await saveSchedule({ eventId: EVENT, name: 'Name', document: document(), publish: true })).toMatchObject({ success: false })
        expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('seminar_schedules')
    })
    it('allows an assigned PIC and keeps read access for an advertiser', async () => {
        const insert = new MockQueryBuilder(row()); database([insert], 'user', 'pic')
        expect((await saveSchedule({ eventId: EVENT, name: 'Name', document: document(), publish: false })).success).toBe(true)
        database([new MockQueryBuilder(row())], 'user', 'advertiser')
        expect(await getSchedule(ID)).toMatchObject({ success: true, data: { canManage: false } })
    })
    it('does not expose an unassigned event schedule', async () => {
        database([new MockQueryBuilder(row())], 'user')
        expect(await getSchedule(ID)).toMatchObject({ success: false })
    })
    it('scopes overview reads to assigned events and returns summaries without draft payloads', async () => {
        const assignments = new MockQueryBuilder([{ event_id: EVENT, role: 'pic' }]), events = new MockQueryBuilder([{ id: EVENT, name: 'Seminar', logo_url: null }]), schedules = new MockQueryBuilder([row()])
        vi.mocked(mockSupabaseClient.from).mockImplementation(table => table === 'profiles' ? new MockQueryBuilder({ role: 'user' }) : table === 'event_assignments' ? assignments : table === 'events' ? events : schedules)
        const result = await getScheduleOverview()
        expect(result).toMatchObject({ success: true, data: { events: [{ canManage: true }], schedules: [{ cityCount: 1, sessionCount: 1 }] } })
        expect(events.in).toHaveBeenCalledWith('id', [EVENT])
        expect(schedules.in).toHaveBeenCalledWith('event_id', [EVENT])
        expect(JSON.stringify(result)).not.toContain('checkoutUrl')
    })
})

describe('draft, publish, duplication, and concurrency', () => {
    it('saves a draft without changing the public snapshot', async () => {
        const publicDocument = document(); publicDocument.cities[0].name = 'Malang published'
        const old = row({ status: 'published', published_version: 1, published_document: publicDocument }), update = new MockQueryBuilder(row({ ...old, version: 2 }))
        database([new MockQueryBuilder(old), update])
        const result = await saveSchedule({ id: ID, eventId: EVENT, name: 'Edited', document: document(), version: 1, publish: false })
        expect(result.success).toBe(true)
        expect(result).toMatchObject({ data: { publishedCities: [{ name: 'Malang published' }] } })
        expect(update.update.mock.calls[0][0]).not.toHaveProperty('published_document')
        expect(update.update.mock.calls[0][0]).not.toHaveProperty('status')
        expect(update.eq).toHaveBeenCalledWith('version', 1)
    })
    it('atomically publishes the same validated draft and public snapshot', async () => {
        const insert = new MockQueryBuilder(row({ status: 'published', published_version: 1 })); database([insert])
        expect((await saveSchedule({ eventId: EVENT, name: 'November', document: document(), publish: true })).success).toBe(true)
        const saved = insert.insert.mock.calls[0][0]
        expect(saved.draft_document).toEqual(saved.published_document)
        expect(saved).toMatchObject({ status: 'published', version: 1, published_version: 1, created_by: ACTOR, city_count: 1, session_count: 1 })
    })
    it('rejects cross-event writes and outdated revisions before mutation', async () => {
        const query = new MockQueryBuilder(row()); database([query])
        expect((await saveSchedule({ id: ID, eventId: OTHER, name: 'Bad', document: document(), version: 1, publish: false })).success).toBe(false)
        expect(query.update).not.toHaveBeenCalled()
        database([query])
        expect(await saveSchedule({ id: ID, eventId: EVENT, name: 'Bad', document: document(), version: 0, publish: false })).toMatchObject({ success: false, error: expect.stringContaining('tab lain') })
    })
    it('detects a revision race after authorization instead of reporting false success', async () => {
        database([new MockQueryBuilder(row()), new MockQueryBuilder(null)])
        expect(await saveSchedule({ id: ID, eventId: EVENT, name: 'Race', document: document(), version: 1, publish: true })).toMatchObject({ success: false, error: expect.stringContaining('tab lain') })
    })
    it('duplicates into a private draft with new city/session identities and copied links', async () => {
        const source = row({ status: 'published', published_version: 1 }), insert = new MockQueryBuilder(row({ id: OTHER }))
        database([new MockQueryBuilder(source), insert])
        expect((await duplicateSchedule(ID)).success).toBe(true)
        const copy = insert.insert.mock.calls[0][0]
        expect(copy).not.toHaveProperty('id')
        expect(copy).not.toHaveProperty('published_document')
        expect(copy.draft_document.cities[0].id).not.toBe(source.draft_document.cities[0].id)
        expect(copy.draft_document.cities[0].sessions[0].checkoutUrl).toBe(source.draft_document.cities[0].sessions[0].checkoutUrl)
    })
    it.each(['archive', 'unpublish', 'restore'] as const)('%s clears the published snapshot and uses a revision guard', async action => {
        const update = new MockQueryBuilder(row({ version: 2 })); database([new MockQueryBuilder(row()), update])
        expect((await changeScheduleStatus(ID, 1, action)).success).toBe(true)
        expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ published_document: null, published_version: null, published_at: null, version: 2, status: action === 'archive' ? 'archived' : 'draft' }))
        expect(update.eq).toHaveBeenCalledWith('version', 1)
    })
})
