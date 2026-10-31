import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import { newScheduleDocument } from './model'
import { GET, OPTIONS } from '@/app/api/public/schedules/[id]/route'

vi.mock('server-only', () => ({}))
const id = '11111111-1111-4111-8111-111111111111'
const context = { params: Promise.resolve({ id }) }
beforeEach(() => vi.clearAllMocks())

describe('public schedule endpoint', () => {
    it('returns only published fields, allows cross-origin embeds, and avoids stale CDN responses', async () => {
        const query = new MockQueryBuilder({ id, published_document: newScheduleDocument(), published_at: '2026-10-31T00:00:00Z' })
        vi.mocked(mockSupabaseClient.from).mockReturnValue(query)
        const response = await GET(new Request('https://example.com'), context)
        expect(response.status).toBe(200)
        expect(response.headers.get('access-control-allow-origin')).toBe('*')
        expect(response.headers.get('cache-control')).toBe('no-store')
        expect(query.eq).toHaveBeenCalledWith('status', 'published')
        expect(query.select.mock.calls[0][0]).not.toMatch(/draft|event_id|created_by|name/)
        expect(Object.keys(await response.json())).toEqual(['id', 'document', 'publishedAt'])
    })
    it('returns a safe 404 for unpublished/archived or unknown schedules', async () => {
        vi.mocked(mockSupabaseClient.from).mockReturnValue(new MockQueryBuilder(null))
        expect((await GET(new Request('https://example.com'), context)).status).toBe(404)
    })
    it('rejects malformed IDs before a database read and hides database failures', async () => {
        expect((await GET(new Request('https://example.com'), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(404)
        expect(mockSupabaseClient.from).not.toHaveBeenCalled()
        vi.mocked(mockSupabaseClient.from).mockReturnValue(new MockQueryBuilder(null, { message: 'private database host' }))
        const response = await GET(new Request('https://example.com'), context)
        expect(response.status).toBe(503)
        expect(await response.text()).not.toContain('private database host')
        expect((await OPTIONS()).status).toBe(204)
    })
})
