import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from '@/auth'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import { getBatch } from './batches'
import { submitBudgetRequest } from './budget'
import { getEvent } from './events'
import { getBatchesForEvent } from './lead-database'

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}))

describe('server action authorization boundaries', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', role: 'user' } } as never)
    })

    it('does not expose an event to an unassigned user', async () => {
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'event_assignments') return new MockQueryBuilder(null)
            if (table === 'events') throw new Error('event must not be queried')
            return new MockQueryBuilder(null)
        })

        await expect(getEvent('event-2')).resolves.toBeNull()
    })

    it('does not expose a batch to an unassigned user', async () => {
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'batches') return new MockQueryBuilder({ id: 'batch-2', event_id: 'event-2' })
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'event_assignments') return new MockQueryBuilder(null)
            return new MockQueryBuilder(null)
        })

        await expect(getBatch('batch-2')).resolves.toBeNull()
    })

    it('does not list batches for an inaccessible event', async () => {
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'event_assignments') return new MockQueryBuilder(null)
            if (table === 'batches') throw new Error('batches must not be queried')
            return new MockQueryBuilder(null)
        })

        await expect(getBatchesForEvent('event-2')).resolves.toEqual({
            error: 'Anda tidak memiliki akses ke event ini',
        })
    })

    it('does not submit a budget request for an inaccessible event', async () => {
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'event_assignments') return new MockQueryBuilder(null)
            if (table === 'budget_requests') throw new Error('request must not be inserted')
            return new MockQueryBuilder(null)
        })

        await expect(submitBudgetRequest('event-2', 100_000)).resolves.toEqual({
            error: 'Tidak memiliki akses ke event ini',
        })
    })
})
