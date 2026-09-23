import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from '@/auth'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import { getOrderOnlineConnectionStatus, startOrderOnlineLogin } from './orderonline'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const BATCH_ID = '22222222-2222-4222-8222-222222222222'
const CONNECTION_ID = '33333333-3333-4333-8333-333333333333'

describe('OrderOnline connection actions', () => {
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

    it('does not create a connection merely by reading its status', async () => {
        const connectionBuilder = new MockQueryBuilder(null)
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'batches') return new MockQueryBuilder({ id: BATCH_ID, event_id: 'event-1' })
            if (table === 'event_assignments') return new MockQueryBuilder({ role: 'advertiser' })
            if (table === 'orderonline_connections') return connectionBuilder
            return new MockQueryBuilder(null)
        })

        await expect(getOrderOnlineConnectionStatus(BATCH_ID)).resolves.toEqual({ status: 'not_connected' })
        expect(connectionBuilder.insert).not.toHaveBeenCalled()
    })

    it('creates an owned connection and returns only the temporary viewer URL', async () => {
        let connectionQueries = 0
        const updateBuilder = new MockQueryBuilder(null)
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'batches') return new MockQueryBuilder({ id: BATCH_ID, event_id: 'event-1' })
            if (table === 'event_assignments') return new MockQueryBuilder({ role: 'advertiser' })
            if (table === 'orderonline_connections') {
                connectionQueries += 1
                if (connectionQueries === 1) return new MockQueryBuilder(null)
                if (connectionQueries === 2) return new MockQueryBuilder({ id: CONNECTION_ID, status: 'not_connected' })
                return updateBuilder
            }
            return new MockQueryBuilder(null)
        })
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                expiresAt: '2026-09-18T10:00:00.000Z',
                status: 'needs_manual_login',
                viewerUrl: 'https://orderonline-connect.example.com/vnc.html?token=temporary',
            }),
        }))

        const result = await startOrderOnlineLogin(BATCH_ID)

        expect(result).toEqual({
            expiresAt: '2026-09-18T10:00:00.000Z',
            status: 'login_required',
            viewerUrl: 'https://orderonline-connect.example.com/vnc.html?token=temporary',
        })
        expect(fetch).toHaveBeenCalledWith(
            `https://orderonline-connect.example.com/api/v1/connections/${CONNECTION_ID}/start`,
            expect.objectContaining({ method: 'POST' }),
        )
        expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'login_required' }))
    })
})
