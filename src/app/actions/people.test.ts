import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import { assignUserToEvent } from './people'

describe('people server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-actor' } } as never)
    })

    it('assigns an admin to an event as an advertiser', async () => {
        const assignmentInsert = new MockQueryBuilder()
        let assignmentCalls = 0

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') {
                return new MockQueryBuilder({ id: 'admin-target', role: 'admin' })
            }
            if (table === 'events') return new MockQueryBuilder({ id: 'event-1' })
            if (table === 'event_assignments') {
                assignmentCalls += 1
                return assignmentCalls === 1
                    ? new MockQueryBuilder(null)
                    : assignmentInsert
            }
            return new MockQueryBuilder(null)
        })

        await expect(assignUserToEvent('admin-target', 'event-1', 'advertiser')).resolves.toEqual({ success: true })

        expect(assignmentInsert.insert).toHaveBeenCalledWith({
            event_id: 'event-1',
            user_id: 'admin-target',
            role: 'advertiser',
        })
        expect(revalidatePath).toHaveBeenCalledWith('/people/admin-target')
    })

    it('does not allow a developer to receive an event-specific role', async () => {
        vi.mocked(mockSupabaseClient.from).mockReturnValue(
            new MockQueryBuilder({ id: 'developer-target', role: 'developer' }) as never
        )

        await expect(assignUserToEvent('developer-target', 'event-1', 'pic')).resolves.toEqual({
            error: 'Developer sudah memiliki akses ke semua event',
        })
    })
})
