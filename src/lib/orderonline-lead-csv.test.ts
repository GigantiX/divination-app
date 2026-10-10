import { describe, expect, it } from 'vitest'
import { parseDelimitedRows, parseOrderOnlineLeadCsv } from './orderonline-lead-csv'

describe('OrderOnline lead CSV', () => {
    it('keeps quoted commas, escaped quotes, and newlines in the correct columns', () => {
        const csv = [
            'order_id,name,email,phone,product,payment_status,address',
            'OO-1,"Ani, Sari",ani@example.com,081234567890,"Workshop ""A""",paid,"Jalan Satu, Blok 2"',
            'OO-2,"Budi\nSantoso",budi@example.com,081234567891,Workshop,unpaid,',
        ].join('\r\n')
        const rows = parseOrderOnlineLeadCsv(csv)
        expect(rows).toHaveLength(2)
        expect(rows?.[0]).toMatchObject({
            order_id: 'OO-1', name: 'Ani, Sari', product: 'Workshop "A"',
            address: 'Jalan Satu, Blok 2', payment_status: 'paid',
        })
        expect(rows?.[1].name).toBe('Budi\nSantoso')
    })

    it('supports BOM and semicolon-delimited contact CSV', () => {
        expect(parseDelimitedRows('\uFEFFname;phone\n"Ani; Sari";081234567890'))
            .toEqual([['name', 'phone'], ['Ani; Sari', '081234567890']])
    })

    it('rejects files without order and payment columns or broken quoting', () => {
        expect(parseOrderOnlineLeadCsv('name,phone\nAni,081234567890')).toBeNull()
        expect(() => parseDelimitedRows('name,phone\n"Ani,081234567890')).toThrow(/kutip/)
    })
})
