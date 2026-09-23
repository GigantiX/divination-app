'use client'

import * as React from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronDown,
    ClipboardCheck,
    Download,
    FileSpreadsheet,
    Loader2,
    RefreshCw,
    Search,
    ShieldCheck,
    UsersRound,
} from 'lucide-react'

import {
    getAttendanceDashboard,
    getAttendanceEvents,
    importOrderOnlineAttendanceCsv,
    setParticipantCheckIn,
    type AttendanceDashboard,
    type AttendanceEvent,
} from '@/app/actions/participant-attendance'
import { getOrderOnlineCsvDownloads, type OrderOnlineCsvDownload } from '@/app/actions/orderonline'
import { type UserProfile } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NavigationLayout } from '@/components/ui/nav-layout'
import { cn } from '@/lib/utils'

import { OrderOnlineConnect } from './orderonline-connect'

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
}

function participantContact(participant: AttendanceDashboard['participants'][number]): string | null {
    return participant.phone ?? participant.email ?? participant.ticketCode ?? participant.orderNumber
}

export function ParticipantAttendanceClient({ profile }: { profile: UserProfile }) {
    const isAdmin = profile.role === 'admin' || profile.role === 'developer'
    const [events, setEvents] = React.useState<AttendanceEvent[]>([])
    const [selectedEventId, setSelectedEventId] = React.useState('')
    const [dashboard, setDashboard] = React.useState<AttendanceDashboard | null>(null)
    const [csvExports, setCsvExports] = React.useState<OrderOnlineCsvDownload[]>([])
    const [search, setSearch] = React.useState('')
    const [appliedSearch, setAppliedSearch] = React.useState('')
    const [message, setMessage] = React.useState<string | null>(null)
    const [isLoadingEvents, setIsLoadingEvents] = React.useState(true)
    const [isLoadingRoster, setIsLoadingRoster] = React.useState(false)
    const [isLoadingExports, setIsLoadingExports] = React.useState(false)
    const [isPending, startTransition] = React.useTransition()

    React.useEffect(() => {
        let active = true
        void getAttendanceEvents().then((result) => {
            if (!active) return
            setIsLoadingEvents(false)
            if (!result.data) {
                setMessage(result.error ?? 'Daftar event tidak dapat dimuat.')
                return
            }
            const availableEvents = result.data
            setEvents(availableEvents)
            setSelectedEventId((current) => current || availableEvents[0]?.id || '')
        })
        return () => { active = false }
    }, [])

    const loadRoster = React.useCallback(async (eventId: string, query: string) => {
        if (!eventId) {
            setDashboard(null)
            return
        }
        setIsLoadingRoster(true)
        const result = await getAttendanceDashboard(eventId, query)
        setIsLoadingRoster(false)
        if (!result.data) {
            setMessage(result.error ?? 'Roster peserta tidak dapat dimuat.')
            return
        }
        setDashboard(result.data)
    }, [])

    React.useEffect(() => {
        void loadRoster(selectedEventId, appliedSearch)
    }, [appliedSearch, loadRoster, selectedEventId])

    const loadExports = React.useCallback(async () => {
        setIsLoadingExports(true)
        const result = await getOrderOnlineCsvDownloads()
        setIsLoadingExports(false)
        if (result.data) {
            setCsvExports(result.data)
            return
        }
        if (result.error && !result.error.includes('belum terhubung')) setMessage(result.error)
    }, [])

    const importCsv = (download: OrderOnlineCsvDownload) => {
        if (!selectedEventId) {
            setMessage('Pilih event sebelum mengimport CSV peserta.')
            return
        }
        startTransition(async () => {
            setMessage(null)
            const result = await importOrderOnlineAttendanceCsv(selectedEventId, download.id)
            if (!result.data) {
                setMessage(result.error ?? 'CSV tidak dapat diimport.')
                return
            }
            setCsvExports((previous) => previous.filter((item) => item.id !== download.id))
            setMessage(`${result.data.imported} peserta siap digunakan${result.data.skipped ? ` · ${result.data.skipped} baris dilewati` : ''}.`)
            await loadRoster(selectedEventId, appliedSearch)
        })
    }

    const toggleCheckIn = (participant: AttendanceDashboard['participants'][number]) => {
        const nextCheckedIn = !participant.checkedInAt
        setDashboard((previous) => previous ? {
            ...previous,
            checkedInCount: previous.checkedInCount + (nextCheckedIn ? 1 : -1),
            participants: previous.participants.map((item) => item.id === participant.id
                ? { ...item, checkedInAt: nextCheckedIn ? new Date().toISOString() : null }
                : item),
        } : previous)

        startTransition(async () => {
            const result = await setParticipantCheckIn(participant.id, nextCheckedIn)
            if (result.error) {
                setMessage(result.error)
                await loadRoster(selectedEventId, appliedSearch)
                return
            }
            if (result.checkedInAt) {
                setDashboard((previous) => previous ? {
                    ...previous,
                    participants: previous.participants.map((item) => item.id === participant.id
                        ? { ...item, checkedInAt: result.checkedInAt ?? item.checkedInAt }
                        : item),
                } : previous)
            }
        })
    }

    const selectedEvent = events.find((event) => event.id === selectedEventId)
    const checkInRate = dashboard?.totalCount ? Math.round((dashboard.checkedInCount / dashboard.totalCount) * 100) : 0

    return <NavigationLayout isAdmin={isAdmin}>
        <div className="mx-auto w-full max-w-6xl flex-1 p-4 pb-28 md:p-7">
            <Link href="/apps" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Kembali ke Apps
            </Link>

            <section className="relative mt-4 overflow-hidden rounded-[2rem] border border-foreground/10 bg-foreground px-5 py-6 text-background shadow-lg sm:px-7 sm:py-8">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-cyan-300/30" />
                <div className="absolute -right-6 top-10 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
                <div className="relative max-w-3xl">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                        <ClipboardCheck className="h-4 w-4" /> Event operations
                    </div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Participant Attendance</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Ambil data peserta dari OrderOnline, siapkan roster per event, lalu catat kedatangan tim secara langsung.</p>
                </div>
            </section>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-5">
                    <OrderOnlineConnect onConnected={() => { void loadExports() }} />

                    <Card className="border-border shadow-sm">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                                        <h2 className="font-semibold text-foreground">CSV dari browser VPS</h2>
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Setelah export di OrderOnline, pilih file di bawah untuk menggabungkannya ke roster event.</p>
                                </div>
                                <Button type="button" variant="outline" onClick={() => { void loadExports() }} disabled={isLoadingExports} className="h-10 shrink-0 rounded-xl">
                                    {isLoadingExports ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Cek CSV
                                </Button>
                            </div>

                            {csvExports.length ? <div className="mt-4 divide-y divide-border rounded-xl border border-border">
                                {csvExports.map((download) => <div key={download.id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">{download.filename}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(download.bytes)} · diunduh {formatTime(download.downloadedAt)}</p>
                                    </div>
                                    <Button type="button" onClick={() => importCsv(download)} disabled={isPending || !selectedEventId} className="h-9 shrink-0 rounded-lg">
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Import
                                    </Button>
                                </div>)}
                            </div> : <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-5 text-sm text-muted-foreground">Belum ada CSV. Buka browser OrderOnline, export CSV peserta, klik <strong className="font-semibold text-foreground">Saya sudah selesai export</strong>, lalu cek lagi di sini.</div>}
                        </CardContent>
                    </Card>
                </div>

                <aside className="space-y-4 xl:pt-1">
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Alur aman</p>
                        <ol className="mt-3 space-y-3 text-sm text-foreground">
                            <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span><span>Login dan selesaikan reCAPTCHA sendiri.</span></li>
                            <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">2</span><span>Export CSV yang Anda butuhkan dari OrderOnline.</span></li>
                            <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">3</span><span>Import dan check-in peserta di roster.</span></li>
                        </ol>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground">
                        <ShieldCheck className="mb-2 h-5 w-5 text-success" />
                        CSV yang belum diimport hanya disimpan sementara di VPS dan otomatis kedaluwarsa. Setelah import berhasil, file dihapus dari VPS.
                    </div>
                </aside>
            </div>

            <section className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary" /><h2 className="font-semibold text-foreground">Roster kedatangan</h2></div>
                            <p className="mt-1 text-sm text-muted-foreground">Pilih event, cari peserta, lalu tandai saat mereka tiba.</p>
                        </div>
                        <label className="relative block min-w-0 lg:w-72">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setAppliedSearch(search) }} placeholder="Cari nama, HP, tiket…" className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25" />
                        </label>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label className="relative block min-w-0 flex-1 sm:max-w-md">
                            <select value={selectedEventId} onChange={(event) => { setSelectedEventId(event.target.value); setAppliedSearch('') }} disabled={isLoadingEvents || !events.length} className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25">
                                {!events.length ? <option value="">Tidak ada event yang dapat diakses</option> : events.map((event) => <option key={event.id} value={event.id}>{event.name} · {event.status}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </label>
                        <Button type="button" variant="outline" onClick={() => setAppliedSearch(search)} disabled={!selectedEventId || isLoadingRoster} className="h-11 rounded-xl">Cari roster</Button>
                    </div>
                </div>

                {message ? <p role="status" className="mx-4 mt-4 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm text-primary sm:mx-5">{message}</p> : null}

                {selectedEvent && dashboard ? <>
                    <div className="grid gap-px border-y border-border bg-border sm:grid-cols-3">
                        <div className="bg-card p-4 sm:px-5"><p className="text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">Total peserta</p><p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{dashboard.totalCount}</p></div>
                        <div className="bg-card p-4 sm:px-5"><p className="text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">Sudah datang</p><p className="mt-1 text-2xl font-bold tracking-tight text-success">{dashboard.checkedInCount}</p></div>
                        <div className="bg-card p-4 sm:px-5"><p className="text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">Kehadiran</p><p className="mt-1 text-2xl font-bold tracking-tight text-primary">{checkInRate}%</p></div>
                    </div>

                    {isLoadingRoster ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat roster…</div> : dashboard.participants.length ? <div className="divide-y divide-border">
                        {dashboard.participants.map((participant) => {
                            const contact = participantContact(participant)
                            return <div key={participant.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{participant.displayName}</p>{participant.checkedInAt ? <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success"><Check className="h-3 w-3" />Hadir</span> : null}</div>
                                    <p className="mt-1 truncate text-sm text-muted-foreground">{contact ?? 'Data kontak tidak tersedia'}{participant.productName ? ` · ${participant.productName}` : ''}</p>
                                    {participant.checkedInAt ? <p className="mt-1 text-xs text-success">Check-in {formatTime(participant.checkedInAt)}</p> : null}
                                </div>
                                <Button type="button" variant={participant.checkedInAt ? 'outline' : 'default'} onClick={() => toggleCheckIn(participant)} disabled={isPending} className={cn('h-10 shrink-0 rounded-xl', participant.checkedInAt ? 'border-success/30 text-success hover:bg-success/10 hover:text-success' : '')}>
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{participant.checkedInAt ? 'Batalkan hadir' : 'Tandai hadir'}
                                </Button>
                            </div>
                        })}
                    </div> : <div className="p-10 text-center text-sm text-muted-foreground">Belum ada peserta yang cocok. Import CSV atau ubah pencarian.</div>}

                    {dashboard.imports.length ? <div className="border-t border-border bg-muted/40 px-4 py-4 sm:px-5"><p className="text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">Import terbaru</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{dashboard.imports.map((item) => <span key={item.id}>{item.filename} · {item.rowsImported} peserta</span>)}</div></div> : null}
                </> : <div className="p-10 text-center text-sm text-muted-foreground">{isLoadingEvents || isLoadingRoster ? 'Menyiapkan roster…' : 'Pilih event untuk melihat roster kehadiran.'}</div>}
            </section>
        </div>
    </NavigationLayout>
}
