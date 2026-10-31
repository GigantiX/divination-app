import { describe, expect, it } from 'vitest'
import { buildTrackedUrl, documentSummary, duplicateDocument, embedCode, newScheduleDocument } from './model'
import { validateAnimationUpload, validateScheduleDocument } from './validation'
import { applyTemplate, SCHEDULE_TEMPLATES } from './templates'

function complete() {
    const doc = newScheduleDocument()
    doc.cities[0].name = 'Malang'
    Object.assign(doc.cities[0].sessions[0], { date: '2026-11-07', time: '14:00', venue: 'Hotel Malang', checkoutUrl: 'https://checkout.orderonline.id/sesi-1?product=abc#form' })
    return doc
}

describe('schedule document boundaries', () => {
    it.each(SCHEDULE_TEMPLATES)('validates $name with editable colors and styles', template => {
        const doc = complete()
        doc.theme = { ...applyTemplate(doc.theme, template.id), accent: '#123456', shadow: 'bold', border: 'dashed' }
        expect(validateScheduleDocument(doc, true).theme).toMatchObject({ preset: template.id, accent: '#123456', shadow: 'bold', border: 'dashed' })
    })
    it('keeps previously published documents compatible and rejects CSS injection in new controls', () => {
        const doc = complete()
        delete doc.theme.alignment; delete doc.theme.shadow; delete doc.theme.border; delete doc.theme.buttonStyle
        expect(validateScheduleDocument(doc).theme).toMatchObject({ alignment: 'center', shadow: 'soft', border: 'solid', buttonStyle: 'solid' })
        doc.theme.shadow = 'none;display:none' as never
        expect(() => validateScheduleDocument(doc)).toThrow('Bayangan kartu')
    })
    it('permits incomplete drafts but requires publishable cities, sessions and links', () => {
        expect(validateScheduleDocument(newScheduleDocument()).cities).toHaveLength(1)
        expect(() => validateScheduleDocument(newScheduleDocument(), true)).toThrow('nama setiap kota')
        expect(validateScheduleDocument(complete(), true).cities[0].sessions[0].venue).toBe('Hotel Malang')
        const doc = complete(); doc.cities[0].sessions[0].checkoutUrl = ''
        expect(() => validateScheduleDocument(doc, true)).toThrow('link OO')
        doc.cities[0].sessions[0].status = 'sold_out'
        expect(() => validateScheduleDocument(doc, true)).not.toThrow()
    })

    it.each(['javascript:alert(1)', 'data:text/html,test', 'https://user:secret@example.com/'])('rejects unsafe checkout URLs (%s)', url => {
        const doc = complete(); doc.cities[0].sessions[0].checkoutUrl = url
        expect(() => validateScheduleDocument(doc)).toThrow('URL http/https')
    })

    it('rejects impossible dates, invalid timezones, and reversed same-day times', () => {
        const doc = complete(); doc.cities[0].sessions[0].date = '2026-02-30'
        expect(() => validateScheduleDocument(doc)).toThrow('Tanggal/jam')
        doc.cities[0].sessions[0].date = '2026-11-07'; doc.cities[0].sessions[0].endTime = '08:00'
        expect(() => validateScheduleDocument(doc)).toThrow('Jam selesai')
        doc.cities[0].sessions[0].endTime = ''; doc.cities[0].sessions[0].timezone = 'UTC' as never
        expect(() => validateScheduleDocument(doc)).toThrow('Zona waktu')
    })

    it('validates actual/manual seat bounds, identities, colors, and total document size', () => {
        const doc = complete(), session = doc.cities[0].sessions[0]
        session.seats.mode = 'actual'; session.seats.booked = 101
        expect(() => validateScheduleDocument(doc)).toThrow('kapasitas')
        session.seats.booked = 0; doc.cities[0].sessions.push(structuredClone(session))
        expect(() => validateScheduleDocument(doc)).toThrow('ID kota/sesi')
        doc.cities[0].sessions.pop(); doc.theme.text = 'red;display:none'
        expect(() => validateScheduleDocument(doc)).toThrow('HEX')
        expect(() => validateScheduleDocument({ ...complete(), unexpected: 'a'.repeat(500_000) })).toThrow('terlalu besar')
    })

    it('requires a fixed countdown deadline on publish and valid animation data', () => {
        const doc = complete(); doc.countdown.mode = 'fixed'
        expect(() => validateScheduleDocument(doc, true)).toThrow('batas waktu')
        doc.countdown.deadline = '2026-11-07T13:00'
        expect(() => validateScheduleDocument(doc, true)).not.toThrow()
        doc.animation.mode = 'lottie'
        expect(() => validateScheduleDocument(doc, true)).toThrow('Upload animasi')
        expect(() => validateAnimationUpload('{"layers":[],"fr":30,"w":80,"h":80}')).not.toThrow()
        expect(() => validateAnimationUpload('<script>alert(1)</script>')).toThrow('valid')
        expect(() => validateAnimationUpload('a'.repeat(200_001))).toThrow('200 KB')
    })

    it('picks an explicit public schema and duplicates nested identities without mutating the source', () => {
        const doc = complete()
        expect(validateScheduleDocument({ ...doc, secret: 'private' })).not.toHaveProperty('secret')
        const copy = duplicateDocument(doc)
        expect(copy.cities[0].id).not.toBe(doc.cities[0].id)
        expect(copy.cities[0].sessions[0].id).not.toBe(doc.cities[0].sessions[0].id)
        expect(copy.cities[0].sessions[0].checkoutUrl).toBe(doc.cities[0].sessions[0].checkoutUrl)
        copy.cities[0].name = 'Surabaya'
        expect(doc.cities[0].name).toBe('Malang')
        expect(documentSummary(copy)).toEqual({ city_count: 1, session_count: 1, city_names: ['Surabaya'] })
    })
})

describe('embed and OrderOnline tracking', () => {
    it('merges tracking once while preserving checkout parameters and fragments', () => {
        const destination = 'https://checkout.orderonline.id/form?product=abc&utm_source=old&utm_source=duplicate#register'
        const tracked = new URL(buildTrackedUrl(destination, '?utm_source=facebook&utm_content=Kota%20Malang&fbclid=click-1&product=evil', '_fbp=browser-1; fbc=click-cookie'))
        expect(tracked.searchParams.getAll('utm_source')).toEqual(['facebook'])
        expect(tracked.searchParams.get('utm_content')).toBe('Kota Malang')
        expect(tracked.searchParams.get('product')).toBe('abc')
        expect(tracked.searchParams.get('fbp')).toBe('browser-1')
        expect(tracked.searchParams.get('fbc')).toBe('click-cookie')
        expect(tracked.hash).toBe('#register')
        expect(buildTrackedUrl(tracked.toString(), '?utm_source=facebook', '_fbp=browser-1; fbc=click-cookie')).toBe(tracked.toString())
    })
    it('creates stable embed snippets with an optional city filter', () => {
        const doc = complete(), id = crypto.randomUUID(), city = doc.cities[0].id
        expect(embedCode('https://divination.example/app', id, city)).toBe(`<div data-divination-schedule="${id}" data-city="${city}"></div>\n<script src="https://divination.example/embed/schedule.js" defer></script>`)
        expect(embedCode('https://divination.example', '<script>')).toBe('')
    })
})
