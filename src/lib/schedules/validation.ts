import { TIMEZONES } from './model'
import { THEME_PRESETS } from './templates'
import type { ScheduleTemplate } from './types'
import type { CountdownSettings, ScheduleDocument } from './types'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const MAX_ANIMATION_BYTES = 200_000

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Format data schedule tidak valid.')
    return value as Record<string, unknown>
}
function text(value: unknown, label: string, max: number): string {
    if (typeof value !== 'string' || value.length > max) throw new Error(`${label} maksimal ${max} karakter.`)
    return value.trim()
}
function oneOf<T extends string>(value: unknown, choices: readonly T[], label: string): T {
    if (!choices.includes(value as T)) throw new Error(`${label} tidak valid.`)
    return value as T
}
function number(value: unknown, min: number, max: number, label: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label} harus antara ${min}–${max}.`)
    return value
}
function bool(value: unknown): boolean {
    if (typeof value !== 'boolean') throw new Error('Pilihan pengaturan tidak valid.')
    return value
}
function color(value: unknown): string {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Gunakan warna HEX enam digit.')
    return value
}
function url(value: unknown, label: string): string {
    const result = text(value, label, 2048)
    if (!result) return ''
    try {
        const parsed = new URL(result)
        if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error()
        return parsed.toString()
    } catch { throw new Error(`${label} harus berupa URL http/https yang valid.`) }
}
function validDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
function validTime(value: string): boolean { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) }

function countdown(value: unknown, publish: boolean): CountdownSettings {
    const input = object(value)
    const result: CountdownSettings = {
        mode: oneOf(input.mode, ['off', 'fixed', 'evergreen'], 'Mode countdown'),
        deadline: text(input.deadline, 'Batas diskon', 16),
        timezone: oneOf(input.timezone, TIMEZONES.map(zone => zone.value), 'Zona waktu countdown'),
        minutes: number(input.minutes, 1, 10080, 'Durasi countdown'),
        label: text(input.label, 'Label countdown', 150),
        expiredText: text(input.expiredText, 'Pesan diskon berakhir', 200),
        expiryAction: oneOf(input.expiryAction, ['message', 'hide_timer', 'close_cta'], 'Aksi countdown'),
    }
    if (result.deadline && (!validDate(result.deadline.slice(0, 10)) || result.deadline[10] !== 'T' || !validTime(result.deadline.slice(11)))) throw new Error('Tanggal/jam countdown tidak valid.')
    if (publish && result.mode === 'fixed' && !result.deadline) throw new Error('Isi batas waktu diskon terlebih dahulu.')
    return result
}

export function validateAnimationUpload(value: string): void {
    if (new TextEncoder().encode(value).length > MAX_ANIMATION_BYTES) throw new Error('File animasi maksimal 200 KB.')
    if (/^data:image\/(png|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value)) return
    try {
        const data = object(JSON.parse(value))
        if (!Array.isArray(data.layers) || typeof data.fr !== 'number' || typeof data.w !== 'number' || typeof data.h !== 'number' || data.fr <= 0 || data.w <= 0 || data.h <= 0) throw new Error()
    } catch { throw new Error('Gunakan file Lottie JSON, GIF, PNG, atau WebP yang valid.') }
}

/** Pick an explicit schema: untrusted action arguments never become arbitrary public JSON. */
export function validateScheduleDocument(value: unknown, publish = false): ScheduleDocument {
    if (new TextEncoder().encode(JSON.stringify(value)).length > 500_000) throw new Error('Data schedule terlalu besar (maksimal 500 KB).')
    const input = object(value)
    if (input.schemaVersion !== 1) throw new Error('Versi schedule tidak didukung.')
    const theme = object(input.theme), cta = object(input.cta), animation = object(input.animation)
    const ids = new Set<string>()
    const id = (value: unknown) => {
        if (typeof value !== 'string' || !UUID_PATTERN.test(value) || ids.has(value)) throw new Error('ID kota/sesi tidak valid atau duplikat.')
        ids.add(value)
        return value
    }
    if (!Array.isArray(input.cities) || input.cities.length > 40) throw new Error('Maksimal 40 kota dalam satu schedule.')
    const cities = input.cities.map(rawCity => {
        const city = object(rawCity)
        if (!Array.isArray(city.sessions) || city.sessions.length > 30) throw new Error('Maksimal 30 sesi per kota.')
        const name = text(city.name, 'Nama kota', 120)
        if (publish && !name) throw new Error('Isi nama setiap kota sebelum publish.')
        if (publish && !city.sessions.length) throw new Error(`Tambahkan sesi untuk ${name}.`)
        return {
            id: id(city.id), name, province: text(city.province, 'Provinsi', 100),
            sessions: city.sessions.map(rawSession => {
                const session = object(rawSession), seats = object(session.seats)
                const date = text(session.date, 'Tanggal sesi', 10), time = text(session.time, 'Jam sesi', 5), endTime = text(session.endTime, 'Jam selesai', 5)
                if ((date && !validDate(date)) || (time && !validTime(time)) || (endTime && (!validTime(endTime) || (time && endTime < time)))) throw new Error(`Tanggal/jam sesi ${name || 'kota'} tidak valid. Jam selesai harus setelah jam mulai pada hari yang sama.`)
                const venue = text(session.venue, 'Venue', 180), checkoutUrl = url(session.checkoutUrl, 'Link OO')
                const status = oneOf(session.status, ['open', 'sold_out', 'closed', 'cancelled'], 'Status sesi')
                if (publish && (!date || !time || !venue)) throw new Error(`Lengkapi tanggal, jam, dan venue setiap sesi ${name}.`)
                if (publish && status === 'open' && !checkoutUrl) throw new Error(`Isi link OO untuk sesi yang dibuka di ${name}.`)
                const capacity = number(seats.capacity, 1, 1_000_000, 'Kapasitas kursi'), booked = number(seats.booked, 0, 1_000_000, 'Kursi terpakai'), remaining = number(seats.remaining, 0, 1_000_000, 'Sisa kursi')
                const seatMode = oneOf(seats.mode, ['off', 'actual', 'manual'], 'Mode kursi')
                if ((seatMode === 'actual' && booked > capacity) || (seatMode === 'manual' && remaining > capacity)) throw new Error('Kursi terpakai/sisa tidak boleh melebihi kapasitas.')
                return {
                    id: id(session.id), name: text(session.name, 'Nama sesi', 100), date, time, endTime,
                    timezone: oneOf(session.timezone, TIMEZONES.map(zone => zone.value), 'Zona waktu'), venue,
                    address: text(session.address, 'Alamat', 400), checkoutUrl, status, ctaLabel: text(session.ctaLabel, 'Teks CTA sesi', 120),
                    seats: { mode: seatMode, capacity, booked, remaining, showProgress: bool(seats.showProgress), label: text(seats.label, 'Label kursi', 150) },
                    countdown: session.countdown === null ? null : countdown(session.countdown, publish),
                }
            }),
        }
    })
    if (publish && !cities.length) throw new Error('Tambahkan minimal satu kota dan sesi sebelum publish.')
    const animationMode = oneOf(animation.mode, ['off', 'arrows', 'lottie', 'image'], 'Mode animasi')
    const upload = text(animation.upload, 'File animasi', MAX_ANIMATION_BYTES)
    if (upload) validateAnimationUpload(upload)
    const animationUrl = url(animation.url, 'URL animasi')
    if (publish && ['lottie', 'image'].includes(animationMode) && !upload && !animationUrl) throw new Error('Upload animasi atau isi URL aset animasi.')
    if (upload && animationMode === 'lottie' && upload.startsWith('data:')) throw new Error('Mode Lottie memerlukan file JSON.')
    if (upload && animationMode === 'image' && !upload.startsWith('data:image/')) throw new Error('Mode gambar memerlukan GIF, PNG, atau WebP.')
    return {
        schemaVersion: 1, heading: text(input.heading, 'Judul publik', 180), subtitle: text(input.subtitle, 'Subjudul', 300),
        emptyMessage: text(input.emptyMessage, 'Pesan jadwal kosong', 300), cityPrefix: text(input.cityPrefix, 'Awalan judul kota', 60),
        hidePast: bool(input.hidePast), sort: oneOf(input.sort, ['manual', 'date'], 'Urutan kota'), cities,
        theme: {
            preset: oneOf(theme.preset, Object.keys(THEME_PRESETS) as ScheduleTemplate[], 'Template'), background: color(theme.background), card: color(theme.card),
            text: color(theme.text), accent: color(theme.accent), buttonText: color(theme.buttonText),
            font: oneOf(theme.font, ['sans', 'serif', 'rounded'], 'Font'), layout: oneOf(theme.layout, ['stack', 'grid'], 'Layout'),
            radius: number(theme.radius, 0, 32, 'Radius kartu'), gap: number(theme.gap, 12, 64, 'Jarak kartu'), maxWidth: number(theme.maxWidth, 360, 1400, 'Lebar widget'),
            alignment: oneOf(theme.alignment ?? 'center', ['left', 'center'] as const, 'Perataan teks'),
            shadow: oneOf(theme.shadow ?? 'soft', ['none', 'soft', 'bold'] as const, 'Bayangan kartu'),
            border: oneOf(theme.border ?? 'solid', ['none', 'solid', 'dashed'] as const, 'Garis kartu'),
            buttonStyle: oneOf(theme.buttonStyle ?? 'solid', ['solid', 'outline', 'pill'] as const, 'Gaya tombol'),
        },
        cta: {
            label: text(cta.label, 'Teks CTA', 120), soldOutLabel: text(cta.soldOutLabel, 'Label sold out', 120), closedLabel: text(cta.closedLabel, 'Label ditutup', 120),
            newTab: bool(cta.newTab), pulse: bool(cta.pulse),
        },
        countdown: countdown(input.countdown, publish),
        animation: { mode: animationMode, url: animationUrl, upload, size: number(animation.size, 32, 240, 'Ukuran animasi'), count: number(animation.count, 1, 5, 'Jumlah animasi') },
    }
}
