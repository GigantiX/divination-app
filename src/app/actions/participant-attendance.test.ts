import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from '@/auth'
import {
    getOrderOnlineCsvDownloads,
} from '@/app/actions/orderonline'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'

import { importOrderOnlineAttendanceCsv, setParticipantCheckIn } from './participant-attendance'

vi.mock('@/app/actions/orderonline', () => ({
    getOrderOnlineCsvDownloads: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

const USER_ID = '11111111-1111-4111-8111-111111111111'
const EVENT_ID = '22222222-2222-4222-8222-222222222222'
const IMPORT_ID = '33333333-3333-4333-8333-333333333333'
const PARTICIPANT_ID = '44444444-4444-4444-8444-444444444444'
const DOWNLOAD_ID = 'a'.repeat(32)

describe('participant attendance actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID, role: 'user' } } as never)
        process.env.ORDERONLINE_RUNNER_URL = 'https://orderonline-connect.example.com'
        process.env.ORDERONLINE_RUNNER_API_TOKEN = 'a'.repeat(64)
    })

    afterEach(() => {
        delete process.env.ORDERONLINE_RUNNER_URL
        delete process.env.ORDERONLINE_RUNNER_API_TOKEN
        vi.unstubAllGlobals()
    })

    it('imports an OrderOnline CSV server-to-server and clears it from the VPS after success', async () => {
        const importBuilder = new MockQueryBuilder({ id: IMPORT_ID })
        const importUpdateBuilder = new MockQueryBuilder(null)
        const participantsBuilder = new MockQueryBuilder(null)
        let importQueries = 0

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'developer' })
            if (table === 'attendance_imports') {
                importQueries += 1
                return importQueries === 1 ? importBuilder : importUpdateBuilder
            }
            if (table === 'attendance_participants') return participantsBuilder
            if (table === 'orderonline_connections') return new MockQueryBuilder({ id: '55555555-5555-4555-8555-555555555555' })
            return new MockQueryBuilder(null)
        })
        vi.mocked(getOrderOnlineCsvDownloads).mockResolvedValue({
            data: [{ id: DOWNLOAD_ID, filename: 'participants.csv', bytes: 128, downloadedAt: '2026-09-18T10:00:00.000Z' }],
        })
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                text: async () => 'Customer Name,Email,Phone,Ticket Code,Product Name\nAda Lovelace,ada@example.com,08123456789,TK-01,Workshop',
            })
            .mockResolvedValueOnce({ ok: true }))

        await expect(importOrderOnlineAttendanceCsv(EVENT_ID, DOWNLOAD_ID)).resolves.toEqual({
            data: {
                imported: 1,
                skipped: 0,
                sourceColumns: ['customer name', 'email', 'phone', 'ticket code', 'product name'],
            },
        })
        expect(participantsBuilder.upsert).toHaveBeenCalledWith([
            expect.objectContaining({
                display_name: 'Ada Lovelace',
                email: 'ada@example.com',
                event_id: EVENT_ID,
                phone: '628123456789',
                product_name: 'Workshop',
                source_identity: 'ticket:tk-01',
                ticket_code: 'TK-01',
            }),
        ], { onConflict: 'event_id,source_identity' })
        expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('records a crew check-in only after confirming event access', async () => {
        const checkinBuilder = new MockQueryBuilder(null)
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'attendance_participants') return new MockQueryBuilder({ id: PARTICIPANT_ID, event_id: EVENT_ID })
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'event_assignments') return new MockQueryBuilder({ role: 'pic' })
            if (table === 'attendance_checkins') return checkinBuilder
            return new MockQueryBuilder(null)
        })

        const result = await setParticipantCheckIn(PARTICIPANT_ID, true)

        expect(result.error).toBeUndefined()
        expect(checkinBuilder.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                checked_in_by: USER_ID,
                event_id: EVENT_ID,
                participant_id: PARTICIPANT_ID,
            }),
            { onConflict: 'participant_id' },
        )
    })
})
