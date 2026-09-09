import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from '@/auth'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import { deleteBatch, getEventBatches } from './batches'

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
}))

vi.mock('@/lib/date', () => ({
    getJakartaDateString: vi.fn(() => '2026-09-09'),
}))

describe('batch server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('groups batches by end date and keeps the finish date active', async () => {
        vi.mocked(auth).mockResolvedValueOnce({
            user: { id: 'admin-1', role: 'admin' },
        } as never)

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'admin' })
            if (table === 'events') {
                return new MockQueryBuilder({
                    id: 'event-1',
                    name: 'Event Besar',
                    logo_url: null,
                    status: 'active',
                })
            }
            if (table === 'batches') {
                return new MockQueryBuilder([
                    {
                        id: 'ongoing',
                        name: 'Tanpa Batas',
                        start_date: '2026-09-01',
                        end_date: null,
                        price: 100000,
                        notes: null,
                        created_at: '2026-09-01T00:00:00.000Z',
                    },
                    {
                        id: 'ends-today',
                        name: 'Selesai Hari Ini',
                        start_date: '2026-09-02',
                        end_date: '2026-09-09',
                        price: 200000,
                        notes: 'Hari terakhir',
                        created_at: '2026-09-02T00:00:00.000Z',
                    },
                    {
                        id: 'completed',
                        name: 'Sudah Selesai',
                        start_date: '2026-08-01',
                        end_date: '2026-09-08',
                        price: 0,
                        notes: null,
                        created_at: '2026-08-01T00:00:00.000Z',
                    },
                ])
            }
            return new MockQueryBuilder(null)
        })

        const result = await getEventBatches('event-1')

        expect(result?.activeBatches.map((batch) => batch.id)).toEqual(['ongoing', 'ends-today'])
        expect(result?.completedBatches.map((batch) => batch.id)).toEqual(['completed'])
        expect(result?.canEditBatch).toBe(true)
        expect(result?.canDeleteBatch).toBe(true)
    })

    it('allows a PIC to edit but not delete batches', async () => {
        vi.mocked(auth).mockResolvedValueOnce({
            user: { id: 'pic-1', role: 'user' },
        } as never)

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'event_assignments') return new MockQueryBuilder({ role: 'pic' })
            if (table === 'events') {
                return new MockQueryBuilder({ id: 'event-1', name: 'Event Besar', logo_url: null, status: 'active' })
            }
            if (table === 'batches') return new MockQueryBuilder([])
            return new MockQueryBuilder(null)
        })

        const result = await getEventBatches('event-1')

        expect(result?.canCreateBatch).toBe(true)
        expect(result?.canEditBatch).toBe(true)
        expect(result?.canDeleteBatch).toBe(false)
    })

    it('rejects batch deletion by a PIC at the server boundary', async () => {
        vi.mocked(auth).mockResolvedValueOnce({
            user: { id: 'pic-1', role: 'user' },
        } as never)
        const batchQuery = new MockQueryBuilder({ event_id: 'event-1' })

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'batches') return batchQuery
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'event_assignments') return new MockQueryBuilder({ role: 'pic' })
            return new MockQueryBuilder(null)
        })

        await expect(deleteBatch('batch-1')).resolves.toEqual({ error: 'Tidak memiliki akses' })
        expect(batchQuery.delete).not.toHaveBeenCalled()
    })
})
