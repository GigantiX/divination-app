import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth } from '@/auth'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import { createReport, createReportRange } from './reports'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

describe('report range creation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as never)
    })

    it('checks existing dates once and inserts all missing rows in one query', async () => {
        const insertBuilder = new MockQueryBuilder(null)
        let reportQueryCount = 0

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'admin' })
            if (table === 'batches') return new MockQueryBuilder({ id: 'batch-1', event_id: 'event-1' })
            if (table === 'reports') {
                reportQueryCount += 1
                return reportQueryCount === 1
                    ? new MockQueryBuilder([{ report_date: '2026-09-02' }])
                    : insertBuilder
            }
            return new MockQueryBuilder(null)
        })

        const result = await createReportRange({
            batchId: 'batch-1',
            startDate: '2026-09-01',
            endDate: '2026-09-03',
            totalLeadsCount: 9,
            totalClosingCount: 3,
            totalAdsSpent: 300_000,
            taxPercentage: 11,
        })

        expect(result).toEqual({ success: true, created: 2, skipped: 1 })
        expect(reportQueryCount).toBe(2)
        expect(insertBuilder.insert).toHaveBeenCalledOnce()
        expect(insertBuilder.insert).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ report_date: '2026-09-01' }),
            expect.objectContaining({ report_date: '2026-09-03' }),
        ]))
    })

    it('rejects malformed dates before touching the database', async () => {
        const result = await createReportRange({
            batchId: 'batch-1',
            startDate: 'not-a-date',
            endDate: '2026-09-03',
            totalLeadsCount: 9,
            totalClosingCount: 3,
            totalAdsSpent: 300_000,
            taxPercentage: 11,
        })

        expect(result).toEqual({ error: 'Format tanggal tidak valid', created: 0, skipped: 0 })
    })

    it('rejects non-finite single-report values before touching the database', async () => {
        const result = await createReport({
            batchId: 'batch-1',
            reportDate: '2026-09-03',
            leadsCount: 9,
            closingCount: 3,
            adsSpent: Number.NaN,
            taxPercentage: 11,
        })

        expect(result).toEqual({ error: 'Nilai laporan tidak valid' })
        expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })
})
