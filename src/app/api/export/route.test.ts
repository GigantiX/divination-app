import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { GET } from './route'
import { auth } from '@/auth'
import { mockSupabaseClient, MockQueryBuilder } from '@/tests/mocks/supabase'

// Mock next-auth
vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => mockSupabaseClient,
}))

describe('GET /api/export route handler', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const createRequest = (urlStr: string) => {
        return new NextRequest(new URL(urlStr))
    }

    it('should return 401 if user is not authenticated', async () => {
        vi.mocked(auth as any).mockResolvedValueOnce(null)

        const req = createRequest('http://localhost:3000/api/export?type=budget-history')
        const res = await GET(req)
        
        expect(res.status).toBe(401)
        const json = await res.json()
        expect(json.error).toBe('Tidak terautentikasi')
    })

    it('should return 403 if user is not an admin or developer', async () => {
        vi.mocked(auth as any).mockResolvedValueOnce({
            user: { id: 'user-1' }
        } as any)

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') {
                return new MockQueryBuilder({ id: 'user-1', role: 'user' })
            }
            return new MockQueryBuilder(null)
        })

        const req = createRequest('http://localhost:3000/api/export?type=budget-history')
        const res = await GET(req)

        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.error).toBe('Tidak memiliki akses')
    })

    it('should return 400 if type is missing', async () => {
        vi.mocked(auth as any).mockResolvedValueOnce({
            user: { id: 'admin-1' }
        } as any)

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') {
                return new MockQueryBuilder({ id: 'admin-1', role: 'admin' })
            }
            return new MockQueryBuilder(null)
        })

        const req = createRequest('http://localhost:3000/api/export')
        const res = await GET(req)

        expect(res.status).toBe(400)
        const json = await res.json()
        expect(json.error).toBe('Parameter type wajib disertakan')
    })

    it('should return budget-history CSV report for authorized admin', async () => {
        vi.mocked(auth as any).mockResolvedValueOnce({
            user: { id: 'admin-1' }
        } as any)

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') {
                return new MockQueryBuilder({ id: 'admin-1', role: 'admin' })
            }
            if (table === 'budget_requests') {
                return new MockQueryBuilder([
                    {
                        created_at: '2026-07-18T10:00:00Z',
                        amount: 1500000,
                        status: 'approved',
                        proof_image_url: 'http://proof.com/1.png',
                        events: { name: 'Promo Event A' },
                        profiles: { full_name: 'John Doe' }
                    }
                ])
            }
            return new MockQueryBuilder(null)
        })

        const req = createRequest('http://localhost:3000/api/export?type=budget-history&format=csv')
        const res = await GET(req)

        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain('text/csv')
        const text = await res.text()
        expect(text).toContain('Promo Event A')
        expect(text).toContain('John Doe')
        expect(text).toContain('1500000')
    })

    it('should return budget-history Excel (xlsx) report for authorized admin', async () => {
        vi.mocked(auth as any).mockResolvedValueOnce({
            user: { id: 'admin-1' }
        } as any)

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') {
                return new MockQueryBuilder({ id: 'admin-1', role: 'admin' })
            }
            if (table === 'budget_requests') {
                return new MockQueryBuilder([
                    {
                        created_at: '2026-07-18T10:00:00Z',
                        amount: 1500000,
                        status: 'approved',
                        proof_image_url: 'http://proof.com/1.png',
                        events: { name: 'Promo Event A' },
                        profiles: { full_name: 'John Doe' }
                    }
                ])
            }
            return new MockQueryBuilder(null)
        })

        const req = createRequest('http://localhost:3000/api/export?type=budget-history&format=xlsx')
        const res = await GET(req)

        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain('vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        const buffer = await res.arrayBuffer()
        expect(buffer.byteLength).toBeGreaterThan(0)
    })

    it('should return event-performance CSV report for authorized admin', async () => {
        vi.mocked(auth as any).mockResolvedValueOnce({
            user: { id: 'admin-1' }
        } as any)

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') {
                return new MockQueryBuilder({ id: 'admin-1', role: 'admin' })
            }
            if (table === 'events') {
                return new MockQueryBuilder({ name: 'Super Event' })
            }
            if (table === 'batches') {
                return new MockQueryBuilder([
                    { id: 'batch-1', name: 'Batch 1', start_date: '2026-07-01', end_date: null, price: 100000 }
                ])
            }
            if (table === 'reports') {
                return new MockQueryBuilder([
                    { batch_id: 'batch-1', ads_spent: 500000, tax_percentage: 11, leads_count: 50, closing_count: 5 }
                ])
            }
            return new MockQueryBuilder(null)
        })

        const req = createRequest('http://localhost:3000/api/export?type=event-performance&eventId=event-1')
        const res = await GET(req)

        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain('text/csv')
        const text = await res.text()
        expect(text).toContain('Super Event')
        expect(text).toContain('Batch 1')
    })
})
