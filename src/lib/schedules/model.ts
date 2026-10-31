import type { CountdownSettings, ScheduleCity, ScheduleDocument, ScheduleSession, ScheduleTimezone } from './types'
import { THEME_PRESETS } from './templates'
export { THEME_PRESETS } from './templates'

export const TIMEZONES: { value: ScheduleTimezone; label: string; offset: string }[] = [
    { value: 'Asia/Jakarta', label: 'WIB', offset: '+07:00' },
    { value: 'Asia/Makassar', label: 'WITA', offset: '+08:00' },
    { value: 'Asia/Jayapura', label: 'WIT', offset: '+09:00' },
]

export function newCountdown(): CountdownSettings {
    return { mode: 'off', deadline: '', timezone: 'Asia/Jakarta', minutes: 30, label: 'Diskon berakhir dalam', expiredText: 'Periode diskon telah berakhir', expiryAction: 'message' }
}

export function newSession(): ScheduleSession {
    return {
        id: crypto.randomUUID(), name: '', date: '', time: '', endTime: '', timezone: 'Asia/Jakarta',
        venue: '', address: '', checkoutUrl: '', ctaLabel: '', status: 'open',
        seats: { mode: 'off', capacity: 100, booked: 0, remaining: 20, showProgress: true, label: 'Tersisa {remaining} kursi' },
        countdown: null,
    }
}

export function newCity(): ScheduleCity {
    return { id: crypto.randomUUID(), name: '', province: '', sessions: [newSession()] }
}

export function newScheduleDocument(): ScheduleDocument {
    return {
        schemaVersion: 1, heading: '', subtitle: '', emptyMessage: 'Jadwal berikutnya segera hadir.', cityPrefix: 'Jadwal',
        hidePast: true, sort: 'manual', cities: [newCity()],
        theme: { preset: 'classic', ...THEME_PRESETS.classic, font: 'sans', layout: 'stack', gap: 32, maxWidth: 800 },
        cta: { label: 'Ambil Diskon Sekarang', soldOutLabel: 'Sold Out', closedLabel: 'Pendaftaran Ditutup', newTab: false, pulse: false },
        countdown: newCountdown(), animation: { mode: 'off', url: '', upload: '', size: 96, count: 3 },
    }
}

export function duplicateCity(city: ScheduleCity): ScheduleCity {
    return { ...structuredClone(city), id: crypto.randomUUID(), sessions: city.sessions.map(duplicateSession) }
}

export function duplicateSession(session: ScheduleSession): ScheduleSession {
    return { ...structuredClone(session), id: crypto.randomUUID() }
}

export function duplicateDocument(document: ScheduleDocument): ScheduleDocument {
    return { ...structuredClone(document), cities: document.cities.map(duplicateCity) }
}

export function documentSummary(document: ScheduleDocument) {
    return {
        city_count: document.cities.length,
        session_count: document.cities.reduce((total, city) => total + city.sessions.length, 0),
        city_names: document.cities.map(city => city.name).filter(Boolean),
    }
}

export function embedCode(origin: string, id: string, city = ''): string {
    const safeOrigin = new URL(origin).origin
    if (!/^[a-f0-9-]{36}$/i.test(id) || (city && !/^[a-f0-9-]{36}$/i.test(city))) return ''
    return `<div data-divination-schedule="${id}"${city ? ` data-city="${city}"` : ''}></div>\n<script src="${safeOrigin}/embed/schedule.js" defer></script>`
}

const TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'fbclid', 'gclid', 'msclkid', 'fbp', 'fbc']

export function buildTrackedUrl(destination: string, search: string, cookies = ''): string {
    try {
        const url = new URL(destination)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
        const incoming = new URLSearchParams(search)
        for (const key of TRACKING_KEYS) {
            const value = incoming.get(key)
            if (value) url.searchParams.set(key, value)
        }
        for (const key of ['fbp', 'fbc']) {
            if (incoming.get(key)) continue
            const found = cookies.split(';').map(part => part.trim()).find(part => part.startsWith(`${key}=`) || part.startsWith(`_${key}=`))
            if (found) {
                const value = found.slice(found.indexOf('=') + 1)
                try { url.searchParams.set(key, decodeURIComponent(value)) } catch { url.searchParams.set(key, value) }
            }
        }
        return url.toString()
    } catch { return '' }
}
