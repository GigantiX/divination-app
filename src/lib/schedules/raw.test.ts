import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { newScheduleDocument } from './model'
import { rawScheduleHtml } from './raw'

const renderer = readFileSync('public/embed/schedule.js', 'utf8')
const id = '11111111-1111-4111-8111-111111111111'

describe('standalone schedule HTML', () => {
    it('embeds the same renderer and safely preserves editable session data', () => {
        const doc = newScheduleDocument(), city = doc.cities[0], session = city.sessions[0]
        city.name = '</script><script>alert(1)</script>'
        Object.assign(session, { date: '2027-11-07', time: '14:00', venue: 'Hotel', checkoutUrl: 'https://example.orderonline.id/form?product=1&x=2', status: 'sold_out' })
        const html = rawScheduleHtml(doc, renderer, id)
        expect(html).toContain('\\u003c/script\\u003e')
        expect(html).toContain('"status": "sold_out"')
        expect(html).toContain('data-divination-raw')
        expect(html).not.toContain('<script src=')
        const data = html.match(/<textarea hidden data-schedule-data style="display:none!important">\n([\s\S]*?)\n<\/textarea>/)![1]
        expect(JSON.parse(data)).toEqual(doc)
        expect(html).toContain('<script data-divination-raw style="display:none!important">')
        expect(() => rawScheduleHtml(doc, 'invalid', id)).toThrow()
    })

    it('renders a raw snapshot independently even when the online widget is already loaded', () => {
        const doc = newScheduleDocument()
        doc.hidePast = false
        doc.cities[0].name = 'Malang'
        Object.assign(doc.cities[0].sessions[0], { date: '2035-11-07', time: '14:00', venue: 'Hotel', checkoutUrl: 'https://example.orderonline.id/form' })
        const host = document.createElement('div'), data = document.createElement('textarea')
        data.setAttribute('data-schedule-data', ''); data.value = JSON.stringify(doc); host.append(data); host.dataset.scheduleKey = id
        host.setAttribute('data-divination-raw-host', id); document.body.append(host)
        const current = vi.spyOn(document, 'currentScript', 'get').mockReturnValue(null)
        const onlineWidget = window.DivinationSchedules
        const fetchSpy = vi.spyOn(window, 'fetch')
        try {
            window.eval(renderer.replace('var rawScheduleToken = null // RAW_SCHEDULE_TOKEN', `var rawScheduleToken = '${id}' // RAW_SCHEDULE_TOKEN`))
            expect(host.shadowRoot?.querySelector('.city-name')?.textContent).toBe('Malang')
            expect(host.shadowRoot?.querySelector('a.oo-link')).not.toBeNull()
            expect(window.DivinationSchedules).toBe(onlineWidget)
            expect(fetchSpy).not.toHaveBeenCalled()
        } finally { current.mockRestore(); fetchSpy.mockRestore(); host.remove() }
    })
})
