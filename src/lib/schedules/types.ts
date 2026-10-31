export type ScheduleStatus = 'draft' | 'published' | 'archived'
export type SessionStatus = 'open' | 'sold_out' | 'closed' | 'cancelled'
export type ScheduleTimezone = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'

export interface CountdownSettings {
    mode: 'off' | 'fixed' | 'evergreen'
    deadline: string
    timezone: ScheduleTimezone
    minutes: number
    label: string
    expiredText: string
    expiryAction: 'message' | 'hide_timer' | 'close_cta'
}

export interface SeatSettings {
    mode: 'off' | 'actual' | 'manual'
    capacity: number
    booked: number
    remaining: number
    showProgress: boolean
    label: string
}

export interface ScheduleSession {
    id: string
    name: string
    date: string
    time: string
    endTime: string
    timezone: ScheduleTimezone
    venue: string
    address: string
    checkoutUrl: string
    ctaLabel: string
    status: SessionStatus
    seats: SeatSettings
    countdown: CountdownSettings | null
}

export interface ScheduleCity {
    id: string
    name: string
    province: string
    sessions: ScheduleSession[]
}

export interface ScheduleDocument {
    schemaVersion: 1
    heading: string
    subtitle: string
    emptyMessage: string
    cityPrefix: string
    hidePast: boolean
    sort: 'manual' | 'date'
    cities: ScheduleCity[]
    theme: {
        preset: 'classic' | 'minimal' | 'warm'
        background: string
        card: string
        text: string
        accent: string
        buttonText: string
        font: 'sans' | 'serif' | 'rounded'
        layout: 'stack' | 'grid'
        radius: number
        gap: number
        maxWidth: number
    }
    cta: { label: string; soldOutLabel: string; closedLabel: string; newTab: boolean; pulse: boolean }
    countdown: CountdownSettings
    animation: { mode: 'off' | 'arrows' | 'lottie' | 'image'; url: string; upload: string; size: number; count: number }
}

export interface ScheduleRecord {
    id: string
    eventId: string
    name: string
    status: ScheduleStatus
    document: ScheduleDocument
    version: number
    publishedVersion: number | null
    publishedAt: string | null
    publishedCities?: Pick<ScheduleCity, 'id' | 'name'>[]
    updatedAt: string
}

export interface ScheduleSummary extends Omit<ScheduleRecord, 'document' | 'publishedCities'> {
    cityCount: number
    sessionCount: number
    cityNames: string[]
}

export interface ScheduleEvent {
    id: string
    name: string
    logoUrl: string | null
    canManage: boolean
}

export type ScheduleResult<T> = { success: true; data: T } | { success: false; error: string }

export interface WidgetOptions { preview?: boolean; key?: string; city?: string; search?: string }
export interface ScheduleWidget {
    render: (host: HTMLElement, document: ScheduleDocument, options?: WidgetOptions) => () => void
    scan: () => void
    buildTrackedUrl: (url: string, search: string, cookies?: string) => string
}

declare global {
    interface Window { DivinationSchedules?: ScheduleWidget }
}
