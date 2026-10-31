import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTrackedUrl, duplicateCity, newScheduleDocument, newSession } from './model'
import type { ScheduleDocument } from './types'
import { applyTemplate, SCHEDULE_TEMPLATES } from './templates'
import '../../../public/embed/schedule.js'

let cleanup: (() => void) | undefined
function mount(doc: ScheduleDocument, options = {}) {
    const host = document.createElement('div'); document.body.append(host)
    cleanup = window.DivinationSchedules!.render(host, doc, { key: 'widget-test', ...options })
    return { host, root: host.shadowRoot! }
}
function fixture() {
    const doc = newScheduleDocument(), session = doc.cities[0].sessions[0]
    doc.hidePast = false; doc.cities[0].name = 'Malang'
    Object.assign(session, { date: '2026-11-07', time: '14:00', venue: 'Hotel Malang', checkoutUrl: 'https://checkout.orderonline.id/malang?product=1#form' })
    return doc
}
beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T07:30:00Z'))
    document.body.replaceChildren(); localStorage.clear()
})
afterEach(() => { cleanup?.(); cleanup = undefined; document.body.replaceChildren(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('standalone Elementor schedule widget', () => {
    it.each(SCHEDULE_TEMPLATES)('renders $name without changing session links or text', template => {
        const doc = fixture()
        doc.theme = { ...applyTemplate(doc.theme, template.id), accent: '#123456', buttonStyle: 'outline' }
        const { root } = mount(doc)
        const widget = root.querySelector<HTMLElement>('.widget')!
        expect(widget.dataset.template).toBe(template.id)
        expect(widget.dataset.button).toBe('outline')
        expect(widget.style.getPropertyValue('--accent')).toBe('#123456')
        expect(root.querySelector('.date-stamp')!.getAttribute('aria-hidden')).toBe('true')
        expect(root.querySelector('.date')!.textContent).toContain('7 November 2026')
        expect(root.querySelector('a.cta')!.getAttribute('href')).toContain('product=1')
    })
    it('renders each session with its own checkout link and the parent LP tracking', () => {
        const doc = fixture(), second = newSession()
        Object.assign(second, { date: '2026-11-08', time: '08:00', venue: 'Hotel Malang', checkoutUrl: 'https://checkout.orderonline.id/malang-2?product=2' })
        doc.cities[0].sessions.push(second)
        const { root } = mount(doc, { search: '?utm_source=facebook&utm_campaign=november' })
        const buttons = root.querySelectorAll<HTMLAnchorElement>('a.cta')
        expect(buttons).toHaveLength(2)
        expect(new URL(buttons[0].href).searchParams.get('product')).toBe('1')
        expect(new URL(buttons[1].href).searchParams.get('product')).toBe('2')
        expect(new URL(buttons[1].href).searchParams.get('utm_campaign')).toBe('november')
        expect(root.textContent).toContain('WIB')
        expect(buttons[0].classList.contains('oo-link')).toBe(false)
    })

    it('closes sold-out and zero-actual-capacity sessions, while display-only seats leave registration open', () => {
        const doc = fixture(), session = doc.cities[0].sessions[0]
        session.status = 'sold_out'
        let rendered = mount(doc)
        expect(rendered.root.querySelector<HTMLButtonElement>('button.cta')!.disabled).toBe(true)
        cleanup?.(); session.status = 'open'; session.seats.mode = 'actual'; session.seats.booked = session.seats.capacity
        rendered = mount(doc)
        expect(rendered.root.querySelector<HTMLButtonElement>('button.cta')!.disabled).toBe(true)
        cleanup?.(); session.seats.mode = 'manual'; session.seats.remaining = 0
        rendered = mount(doc)
        expect(rendered.root.querySelector('a.cta')).not.toBeNull()
        expect(rendered.root.querySelector('.seats')!.textContent).toContain('0 kursi')
    })

    it('uses text nodes for user content, applies custom CTA variables and filters by city ID', () => {
        const doc = fixture(), other = duplicateCity(doc.cities[0])
        other.name = 'Surabaya'; doc.cities.push(other)
        doc.cities[0].name = '<img src=x onerror=alert(1)>'
        doc.cities[0].sessions[0].ctaLabel = 'Daftar {city} · {session}'
        const { root } = mount(doc, { city: doc.cities[0].id })
        expect(root.querySelectorAll('.city')).toHaveLength(1)
        expect(root.querySelector('h3 img')).toBeNull()
        expect(root.querySelector('h3')!.textContent).toContain('<img src=x')
        expect(root.querySelector('.cta')!.textContent).toContain('Sesi 1')
        expect(root.querySelector('h3')!.textContent).not.toContain('Surabaya')
    })

    it('hides expired sessions using each session timezone and end time', () => {
        const doc = fixture(); doc.hidePast = true
        const session = doc.cities[0].sessions[0]
        Object.assign(session, { date: '2026-11-04', time: '15:00', endTime: '16:00', timezone: 'Asia/Jayapura' })
        const { root } = mount(doc)
        expect(root.querySelector('.city')).toBeNull()
        expect(root.querySelector('.empty')).not.toBeNull()
        cleanup?.(); session.timezone = 'Asia/Jakarta'
        expect(mount(doc).root.querySelector('.city')).not.toBeNull()
    })

    it('keeps an evergreen deadline across remounts and closes CTA when it expires', () => {
        const doc = fixture(); Object.assign(doc.countdown, { mode: 'evergreen', minutes: 1, expiryAction: 'close_cta' })
        let result = mount(doc)
        expect(result.root.querySelector('.digits')!.textContent).toContain('00 : 01 : 00')
        vi.advanceTimersByTime(30_000); cleanup?.(); result = mount(doc)
        expect(result.root.querySelector('.digits')!.textContent).toContain('00 : 00 : 30')
        vi.advanceTimersByTime(31_000)
        const button = result.root.querySelector('a.cta')!
        expect(button.getAttribute('aria-disabled')).toBe('true')
        expect(button.hasAttribute('href')).toBe(false)
        button.dispatchEvent(new Event('pointerdown'))
        expect(button.hasAttribute('href')).toBe(false)
        expect(button.textContent).toBe(doc.countdown.expiredText)
        expect(button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(false)
    })

    it('does not close registration for an expired message-only timer', () => {
        const doc = fixture(); Object.assign(doc.countdown, { mode: 'fixed', deadline: '2026-11-04T14:00', expiryAction: 'message' })
        const { root } = mount(doc)
        expect(root.querySelector('.expired')!.textContent).toBe(doc.countdown.expiredText)
        expect(root.querySelector('a.cta')!.getAttribute('href')).toContain('checkout.orderonline.id')
    })

    it('disables preview navigation and releases timers when unmounted', () => {
        const doc = fixture(); doc.countdown.mode = 'evergreen'
        const { root } = mount(doc, { preview: true })
        expect(root.querySelector('a.cta')).toBeNull()
        expect(root.querySelector('button.cta')).not.toBeNull()
        const before = vi.getTimerCount(); cleanup?.()
        expect(vi.getTimerCount()).toBeLessThan(before)
        expect(localStorage.length).toBe(0)
    })

    it('uses the same URL merge behavior as the manager link tester', () => {
        const destination = 'https://checkout.orderonline.id/test?product=1&utm_source=old&utm_source=duplicate#pay'
        const query = '?utm_source=meta&utm_content=Malang%20A&fbclid=click&product=evil'
        expect(window.DivinationSchedules!.buildTrackedUrl(destination, query, '_fbp=browser; fbc=click')).toBe(buildTrackedUrl(destination, query, '_fbp=browser; fbc=click'))
    })
})
