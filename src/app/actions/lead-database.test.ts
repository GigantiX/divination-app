import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockQueryBuilder, mockSupabaseClient } from '@/tests/mocks/supabase'
import type { OrderOnlineLeadRow } from '@/lib/orderonline-lead-csv'
import { importOrderOnlineLeads, updateLeadOrderAttendee } from './lead-database'

const row = (id: string): OrderOnlineLeadRow => ({
    order_id: id, name: 'Test Customer', email: 'test@example.com', phone: '081234567890',
    address: '', province: '', city: '', subdistrict: '', zip: '', product: 'Workshop',
    product_code: 'WORKSHOP', quantity: '1', status: 'completed', payment_status: 'paid',
    payment_method: 'transfer', product_price: '100000', discount: '0',
    gross_revenue: '100000', net_revenue: '100000',
    created_at: '15-09-2026 - 15:21', paid_at: '15-09-2026 - 20:54',
    completed_at: '15-09-2026 - 20:54',
})

describe('importOrderOnlineLeads', () => {
    beforeEach(() => vi.clearAllMocks())

    it('keeps two orders with the same phone and ignores a duplicate CSV row', async () => {
        const orders = new MockQueryBuilder(null)
        const leads = new MockQueryBuilder(null)
        leads.single.mockResolvedValue({ data: { id: 'lead-1' }, error: null })
        const uploads = new MockQueryBuilder({ id: 'upload-1' })
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'admin' })
            if (table === 'batches') return new MockQueryBuilder({ id: 'batch-1' })
            if (table === 'lead_orders') return orders
            if (table === 'leads') return leads
            if (table === 'lead_uploads') return uploads
            if (table === 'lead_events') return new MockQueryBuilder(null)
            return new MockQueryBuilder(null)
        })

        const result = await importOrderOnlineLeads([row('OO-1'), row('OO-2'), row('OO-1')], 'event-1', 'batch-1')

        expect(result.data).toMatchObject({
            total: 3, new_leads: 1, existing_leads: 0,
            new_orders: 2, updated_orders: 0, duplicate_rows: 1, failed: 0,
        })
        expect(orders.insert).toHaveBeenCalledTimes(2)
        expect(orders.insert).toHaveBeenCalledWith(expect.objectContaining({
            order_id: 'OO-1', customer_phone: '6281234567890',
            paid_at: '2026-09-15T20:54:00+07:00', product_price: 100000,
        }))
        expect(orders.insert).toHaveBeenCalledWith(expect.objectContaining({ order_id: 'OO-2' }))
        expect(leads.insert).toHaveBeenCalledTimes(1)
    })

    it('does not move an existing order to another batch', async () => {
        let orderQueries = 0
        const orders = new MockQueryBuilder(null)
        orders.maybeSingle.mockResolvedValue({
            data: { id: 'order-1', event_id: 'event-1', batch_id: 'other-batch' }, error: null,
        })
        const uploads = new MockQueryBuilder({ id: 'upload-1' })
        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'admin' })
            if (table === 'batches') return new MockQueryBuilder({ id: 'batch-1' })
            if (table === 'lead_orders') { orderQueries++; return orders }
            if (table === 'lead_uploads') return uploads
            return new MockQueryBuilder(null)
        })

        const result = await importOrderOnlineLeads([row('OO-1')], 'event-1', 'batch-1')

        expect(orderQueries).toBeGreaterThan(1)
        expect(result.data).toMatchObject({ new_orders: 0, updated_orders: 0, failed: 1, failed_order_ids: ['OO-1'] })
        expect(orders.insert).not.toHaveBeenCalled()
        expect(orders.update).not.toHaveBeenCalled()
    })

    it('edits attendee fields without overwriting buyer or payment data', async () => {
        const order = new MockQueryBuilder({ id: 'order-1' })
        vi.mocked(mockSupabaseClient.from).mockImplementation(table => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'admin' })
            if (table === 'lead_orders') return order
            return new MockQueryBuilder(null)
        })

        const result = await updateLeadOrderAttendee('order-1', {
            ticket_code: 'TICKET-1', attendee_name: 'Test Attendee',
            attendee_email: 'attendee@example.com', attendee_phone: '081234567891',
        })

        expect(result).toEqual({ success: true })
        expect(order.update).toHaveBeenCalledWith({
            ticket_code: 'TICKET-1', attendee_name: 'Test Attendee',
            attendee_email: 'attendee@example.com', attendee_phone: '6281234567891',
        })
    })

    it('blocks non-admins from editing attendee fields', async () => {
        const order = new MockQueryBuilder({ id: 'order-1' })
        vi.mocked(mockSupabaseClient.from).mockImplementation(table => {
            if (table === 'profiles') return new MockQueryBuilder({ role: 'user' })
            if (table === 'lead_orders') return order
            return new MockQueryBuilder(null)
        })

        const result = await updateLeadOrderAttendee('order-1', {
            ticket_code: '', attendee_name: 'Test Attendee', attendee_email: '', attendee_phone: '',
        })

        expect(result.error).toBe('Tidak memiliki akses.')
        expect(order.update).not.toHaveBeenCalled()
    })
})
