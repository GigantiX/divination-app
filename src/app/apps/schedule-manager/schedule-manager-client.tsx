'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, ChevronRight, Code2, Copy, FilePenLine, Layers3, Loader2, MapPin, Plus, Search } from 'lucide-react'
import { NavigationLayout } from '@/components/ui/nav-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { duplicateSchedule } from '@/app/actions/schedules'
import type { UserProfile } from '@/app/actions/profile'
import type { ScheduleEvent, ScheduleResult, ScheduleSummary } from '@/lib/schedules/types'
import { EmbedDialog } from './schedule-preview'

export function ScheduleManagerClient({ profile, overview, selectedEventId }: {
    profile: UserProfile
    overview: ScheduleResult<{ events: ScheduleEvent[]; schedules: ScheduleSummary[] }>
    selectedEventId?: string
}) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [error, setError] = useState('')
    const [embed, setEmbed] = useState<ScheduleSummary | null>(null)
    const [pending, startTransition] = useTransition()
    const events = overview.success ? overview.data.events : []
    const schedules = overview.success ? overview.data.schedules : []
    const selected = events.find(event => event.id === selectedEventId)
    const query = search.trim().toLocaleLowerCase('id-ID')
    const active = schedules.filter(item => item.status !== 'archived')
    const filtered = schedules.filter(item => (!selected || item.eventId === selected.id) && (status === 'all' ? item.status !== 'archived' : item.status === status) && `${item.name} ${item.cityNames.join(' ')}`.toLocaleLowerCase('id-ID').includes(query))
    const canCreate = events.some(event => event.canManage)

    const duplicate = (id: string) => startTransition(async () => {
        setError('')
        try {
            const result = await duplicateSchedule(id)
            if (!result.success) { setError(result.error); return }
            router.push(`/apps/schedule-manager/${result.data.id}`)
        } catch { setError('Gagal menduplikasi schedule. Silakan coba lagi.') }
    })

    return (
        <NavigationLayout isAdmin={profile.role === 'admin' || profile.role === 'developer'}>
            <div className="mx-auto w-full max-w-6xl p-4 pb-28 md:p-8">
                <Link href={selected ? '/apps/schedule-manager' : '/apps'} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{selected ? 'Semua event' : 'Apps'}</Link>
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-primary">Divination Apps / Schedule</p>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{selected?.name || 'Schedule Manager'}</h1>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{selected ? 'Kelola jadwal dan embed untuk event ini.' : 'Satu tempat untuk jadwal seminar di seluruh landing page Anda.'}</p>
                    </div>
                    {(selected ? selected.canManage : canCreate) && <Link href={`/apps/schedule-manager/new${selected ? `?event=${selected.id}` : ''}`}><Button><Plus className="mr-2 h-4 w-4" />Create Schedule</Button></Link>}
                </div>

                {!selected && <div className="mb-8 grid grid-cols-3 gap-3">
                    {[{ label: 'Event', value: new Set(active.map(item => item.eventId)).size, icon: Layers3 }, { label: 'Schedule', value: active.length, icon: CalendarDays }, { label: 'Published', value: active.filter(item => item.status === 'published').length, icon: Check }].map(metric => <div key={metric.label} className="rounded-2xl border border-border bg-card p-4 md:p-5"><metric.icon className="mb-3 h-5 w-5 text-primary" /><p className="text-2xl font-bold tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.label}</p></div>)}
                </div>}
                {(!overview.success || error) && <p role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error || (!overview.success && overview.error)}</p>}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={selected ? 'Cari schedule atau kota' : 'Cari event atau schedule'} placeholder={selected ? 'Cari schedule atau kota…' : 'Cari event atau schedule…'} value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div>
                    {selected && <select aria-label="Filter status schedule" value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">Semua aktif</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Arsip</option></select>}
                </div>

                {!selected ? <div className="grid gap-4 sm:grid-cols-2">
                    {events.filter(event => event.name.toLocaleLowerCase('id-ID').includes(query) || schedules.some(item => item.eventId === event.id && item.name.toLocaleLowerCase('id-ID').includes(query))).map(event => {
                        const items = schedules.filter(item => item.eventId === event.id && item.status !== 'archived')
                        const archivedCount = schedules.filter(item => item.eventId === event.id && item.status === 'archived').length
                        return <Link key={event.id} href={`/apps/schedule-manager?event=${event.id}`} className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/30">
                            <div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{event.name.slice(0, 2).toUpperCase()}</div><ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
                            <h2 className="mt-5 text-lg font-semibold">{event.name}</h2><p className="mt-1 text-sm text-muted-foreground"><span className="font-semibold text-foreground">{items.length}</span> schedule{archivedCount ? ` · ${archivedCount} di arsip` : ''}</p>
                            <div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-success/10 px-2.5 py-1 text-success">{items.filter(item => item.status === 'published').length} published</span><span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{items.filter(item => item.status === 'draft').length} draft</span></div>
                        </Link>
                    })}
                    {!events.length && overview.success && <EmptyState text="Belum ada event yang dapat diakses. Buat event di Dashboard atau minta penugasan event." />}
                </div> : <div className="space-y-3">
                    {filtered.map(item => <article key={item.id} className="rounded-2xl border border-border bg-card p-4 md:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge status={item.status} />{item.status === 'published' && item.version !== item.publishedVersion && <span className="text-xs text-warning">Ada perubahan draft</span>}</div><Link href={`/apps/schedule-manager/${item.id}`} className="text-lg font-semibold hover:text-primary">{item.name}</Link><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{item.cityCount} kota · {item.sessionCount} sesi</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.cityNames.join(' · ') || 'Kota belum ditambahkan'}</p></div>
                            <div className="flex flex-wrap gap-2"><Link href={`/apps/schedule-manager/${item.id}`}><Button variant="outline" size="sm"><FilePenLine className="mr-2 h-4 w-4" />{selected.canManage ? 'Edit' : 'Lihat'}</Button></Link>{selected.canManage && <Button variant="outline" size="sm" disabled={pending} onClick={() => duplicate(item.id)}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}Duplikat</Button>}{item.status === 'published' && <Button variant="outline" size="sm" onClick={() => setEmbed(item)}><Code2 className="mr-2 h-4 w-4" />Embed</Button>}</div>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span>Diperbarui {new Date(item.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}</span><Link href={`/apps/schedule-manager/${item.id}`} className="inline-flex items-center gap-1 hover:text-primary">Buka schedule<ChevronRight className="h-3.5 w-3.5" /></Link></div>
                    </article>)}
                    {!filtered.length && <EmptyState text={query ? 'Tidak ada schedule yang cocok dengan pencarian.' : status === 'archived' ? 'Belum ada schedule yang diarsipkan.' : 'Belum ada schedule. Buat jadwal pertama untuk event ini.'} />}
                </div>}
                {embed && <EmbedDialog id={embed.id} name={embed.name} onClose={() => setEmbed(null)} />}
            </div>
        </NavigationLayout>
    )
}

function EmptyState({ text }: { text: string }) {
    return <div className="col-span-full rounded-2xl border border-dashed border-border px-5 py-14 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{text}</p></div>
}

export function StatusBadge({ status }: { status: string }) {
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === 'published' ? 'bg-success/10 text-success' : status === 'archived' ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning'}`}>{status === 'published' ? 'Published' : status === 'archived' ? 'Arsip' : 'Draft'}</span>
}
