import { afterEach, describe, expect, it, vi } from 'vitest'
import { duplicateCity, newScheduleDocument, newSession } from './model'
import '../../../public/embed/schedule.js'

const id = '11111111-1111-4111-8111-111111111111'

function fixture() {
    const doc = newScheduleDocument()
    doc.hidePast = false
    doc.cities[0].name = 'Jember'
    Object.assign(doc.cities[0].sessions[0], {
        date: '2035-11-07', time: '08:00', venue: 'Hotel <Jember>',
        checkoutUrl: 'https://example.orderonline.id/form?product=1&x=2',
    })
    return doc
}

function install(html: string) {
    const container = document.createElement('div')
    document.body.append(container)
    container.innerHTML = html
    return container
}

afterEach(() => {
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
    vi.useRealTimers()
})

describe('standalone schedule HTML', () => {
    it('includes visible and editable schedule markup before any script runs', () => {
        const doc = fixture()
        const city = doc.cities[0]
        city.name = '</script><script>alert(1)</script>'
        const second = duplicateCity(city)
        second.name = 'Malang'
        doc.cities.push(second)
        const html = window.DivinationSchedules!.exportHtml(doc, id, city.id)
        const container = install(html.replace('Jam 08.00 WIB', 'Jam 09.30 WIB'))

        expect(container.querySelector('.dv-schedule-city-name')?.textContent).toBe(city.name)
        expect(container.querySelector('.dv-schedule-time')?.textContent).toBe('Jam 09.30 WIB')
        expect(container.querySelector('.dv-schedule-venue')?.textContent).toBe('Hotel <Jember>')
        expect(container.querySelector('a.oo-link')?.getAttribute('href')).toBe(city.sessions[0].checkoutUrl)
        expect(container.querySelectorAll('article')).toHaveLength(1)
        expect(container.querySelectorAll('script')).toHaveLength(1)
        expect(container.querySelector('script[src], textarea')).toBeNull()
        expect(html).toContain('<!-- Sesi 1 -->')
    })

    it('switches a session from sold out to open with a single HTML edit', () => {
        const doc = fixture()
        doc.cities[0].sessions[0].status = 'sold_out'
        doc.cities[0].sessions.push({ ...newSession(), checkoutUrl: 'https://example.orderonline.id/second' })
        const html = window.DivinationSchedules!.exportHtml(doc, id)
        const container = install(html)
        const [first, second] = container.querySelectorAll<HTMLElement>('[data-session-id]')
        const link = first.querySelector('a')!
        expect(getComputedStyle(link).display).toBe('none')
        expect(getComputedStyle(first.querySelector('button')!).display).toBe('inline-flex')
        expect(getComputedStyle(second.querySelector('a')!).display).toBe('inline-flex')
        container.remove()
        const edited = install(html.replace('data-status="sold_out"', 'data-status="open"'))
        expect(getComputedStyle(edited.querySelector('a')!).display).toBe('inline-flex')
        expect(getComputedStyle(edited.querySelector('button')!).display).toBe('none')
    })

    it('enhances the existing cards with tracking and countdown without replacing manual edits or fetching data', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2035-11-07T07:59:58+07:00'))
        window.history.replaceState({}, '', '/?utm_source=meta')
        const doc = fixture()
        doc.hidePast = true
        doc.cities[0].sessions[0].endTime = '08:00'
        Object.assign(doc.countdown, { mode: 'fixed', deadline: '2035-11-07T08:00', expiryAction: 'close_cta' })
        const html = window.DivinationSchedules!.exportHtml(doc, id)
        const container = install(html.replace('Jam 08.00', 'Jam 07.30'))
        const link = container.querySelector<HTMLAnchorElement>('a.oo-link')!
        const fetchSpy = vi.spyOn(window, 'fetch')
        try {
            window.eval(container.querySelector('script')!.textContent!)
            expect(new URL(link.href).searchParams.get('utm_source')).toBe('meta')
            expect(container.querySelector('.dv-schedule-time')?.textContent).toBe('Jam 07.30 – 08.00 WIB')
            expect(container.querySelector('a.oo-link')).toBe(link)
            vi.advanceTimersByTime(2000)
            expect(getComputedStyle(link).display).toBe('none')
            expect(container.querySelector('[data-cta-label="expired"]')?.textContent).toBe(doc.countdown.expiredText)
            vi.advanceTimersByTime(60000)
            expect(container.querySelector('[data-session-id]')?.hasAttribute('hidden')).toBe(true)
            expect(container.querySelector('.dv-schedule-empty')?.hasAttribute('hidden')).toBe(false)
            expect(fetchSpy).not.toHaveBeenCalled()
        } finally { fetchSpy.mockRestore() }
    })
})
