'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, ArrowLeft, Check, Code2, Copy, Loader2, Plus, RotateCcw, Save, Send, Trash2, Upload, X } from 'lucide-react'
import { NavigationLayout } from '@/components/ui/nav-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { UserProfile } from '@/app/actions/profile'
import { changeScheduleStatus, deleteSchedule, duplicateSchedule, saveSchedule } from '@/app/actions/schedules'
import { buildTrackedUrl, duplicateCity, newCity } from '@/lib/schedules/model'
import { MAX_ANIMATION_BYTES, validateAnimationUpload } from '@/lib/schedules/validation'
import type { ScheduleDocument, ScheduleEvent, ScheduleRecord } from '@/lib/schedules/types'
import { CityEditor, CountdownEditor, Field, Select, Toggle } from './schedule-form-fields'
import { EmbedDialog, SchedulePreview } from './schedule-preview'
import { StatusBadge } from './schedule-manager-client'
import { TemplateEditor } from './template-editor'

export function ScheduleEditor({ profile, events, initialDocument, initialSchedule, defaultEventId, loadError, canManage }: {
    profile: UserProfile; events: ScheduleEvent[]; initialDocument: ScheduleDocument; initialSchedule?: ScheduleRecord
    defaultEventId?: string; loadError?: string; canManage: boolean
}) {
    const router = useRouter()
    const [record, setRecord] = useState(initialSchedule)
    const [eventId, setEventId] = useState(initialSchedule?.eventId || (events.some(event => event.id === defaultEventId) ? defaultEventId! : ''))
    const [name, setName] = useState(initialSchedule?.name || '')
    const [doc, setDoc] = useState(initialDocument)
    const [baseline, setBaseline] = useState(JSON.stringify({ name: initialSchedule?.name || '', document: initialDocument }))
    const [tab, setTab] = useState<'schedule' | 'appearance' | 'extras'>('schedule')
    const [pending, startTransition] = useTransition()
    const [message, setMessage] = useState('')
    const [error, setError] = useState(loadError || '')
    const [showEmbed, setShowEmbed] = useState(false)
    const dirty = JSON.stringify({ name, document: doc }) !== baseline
    const archived = record?.status === 'archived'
    const editable = canManage && !archived && !pending
    const backHref = eventId ? `/apps/schedule-manager?event=${eventId}` : '/apps/schedule-manager'
    const change = <K extends keyof ScheduleDocument>(key: K, value: ScheduleDocument[K]) => { setDoc(previous => ({ ...previous, [key]: value })); setMessage('') }

    useEffect(() => {
        if (!dirty) return
        const handle = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
        window.addEventListener('beforeunload', handle)
        return () => window.removeEventListener('beforeunload', handle)
    }, [dirty])

    const persist = (publish: boolean) => startTransition(async () => {
        setError(''); setMessage('')
        try {
            const result = await saveSchedule({ id: record?.id, eventId, name, document: doc, version: record?.version, publish })
            if (!result.success) { setError(result.error); return }
            setRecord(result.data); setDoc(result.data.document); setName(result.data.name)
            setBaseline(JSON.stringify({ name: result.data.name, document: result.data.document }))
            setMessage(publish ? 'Jadwal dipublikasikan. LP kini memakai versi ini.' : 'Draft tersimpan. Versi di LP belum berubah.')
            if (!record) router.replace(`/apps/schedule-manager/${result.data.id}`)
        } catch { setError('Gagal menyimpan schedule. Silakan coba lagi.') }
    })

    const changeStatus = (action: 'archive' | 'restore' | 'unpublish') => {
        if (!record) return
        if (dirty && !window.confirm('Ada perubahan yang belum disimpan. Lanjutkan tanpa menyimpan perubahan tersebut?')) return
        startTransition(async () => {
            setError(''); setMessage('')
            try {
                const result = await changeScheduleStatus(record.id, record.version, action)
                if (!result.success) { setError(result.error); return }
                setRecord(result.data); setDoc(result.data.document); setName(result.data.name)
                setBaseline(JSON.stringify({ name: result.data.name, document: result.data.document }))
                setMessage(action === 'archive' ? 'Schedule diarsipkan dan tidak ditayangkan di LP.' : action === 'restore' ? 'Schedule dipulihkan sebagai draft.' : 'Publikasi dihentikan. Schedule kembali menjadi draft.')
            } catch { setError('Gagal memperbarui status schedule.') }
        })
    }

    const duplicate = () => {
        if (!record) return
        if (dirty && !window.confirm('Duplikasi akan memakai draft terakhir yang tersimpan. Lanjutkan?')) return
        startTransition(async () => {
            try {
                const result = await duplicateSchedule(record.id)
                if (!result.success) { setError(result.error); return }
                router.push(`/apps/schedule-manager/${result.data.id}`)
            } catch { setError('Gagal menduplikasi schedule.') }
        })
    }

    const remove = () => {
        if (!record || !window.confirm(`Hapus schedule “${record.name}” secara permanen? Embed jadwal ini akan berhenti ditayangkan.`)) return
        startTransition(async () => {
            setError('')
            try {
                const result = await deleteSchedule(record.id, record.version)
                if (!result.success) { setError(result.error); return }
                router.push(backHref)
            } catch { setError('Gagal menghapus schedule. Silakan coba lagi.') }
        })
    }

    return <NavigationLayout isAdmin={profile.role === 'admin' || profile.role === 'developer'}>
        <div className="mx-auto w-full max-w-[1600px] p-4 pb-28 md:p-7">
            <Link href={backHref} onClick={event => { if (dirty && !window.confirm('Perubahan belum disimpan. Tinggalkan halaman ini?')) event.preventDefault() }} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Daftar schedule</Link>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div><div className="mb-2 flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Schedule editor</p>{record && <StatusBadge status={record.status} />}{dirty && <span className="text-xs text-warning">Belum disimpan</span>}</div><h1 className="text-2xl font-bold tracking-tight">{record ? record.name : 'Create Schedule'}</h1><p className="mt-2 text-sm text-muted-foreground">{canManage ? 'Susun jadwal, periksa preview, lalu publish ke landing page.' : 'Akses lihat schedule.'}</p></div>
                <div className="flex flex-wrap gap-2">{record?.status === 'published' && <Button type="button" variant="outline" onClick={() => setShowEmbed(true)}><Code2 className="mr-2 h-4 w-4" />Embed</Button>}{canManage && (archived ? <Button disabled={pending} onClick={() => changeStatus('restore')}><RotateCcw className="mr-2 h-4 w-4" />Pulihkan draft</Button> : <><Button type="button" variant="outline" disabled={pending || !eventId} onClick={() => persist(false)}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Simpan draft</Button><Button type="button" disabled={pending || !eventId} onClick={() => persist(true)}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{record?.status === 'published' ? 'Publish perubahan' : 'Publish'}</Button></>)}</div>
            </div>
            {error && <p role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success"><Check className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
            {record?.status === 'published' && record.version !== record.publishedVersion && <p className="mb-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">Ada draft yang belum dipublikasikan. LP masih menampilkan versi published sebelumnya.</p>}
            {archived && <p className="mb-5 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">Schedule ini diarsipkan. Embed tidak menayangkan jadwal sampai schedule dipulihkan dan dipublikasikan kembali.</p>}
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]">
                <div className="min-w-0 space-y-5">
                    <fieldset disabled={!editable} className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-5">
                        <Field label="Event Divination"><Select value={eventId} disabled={!!record} onChange={setEventId}><option value="">Pilih event…</option>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</Select></Field>
                        {!events.length && <p className="text-xs text-muted-foreground">Belum ada event yang bisa Anda kelola.</p>}
                        <Field label="Nama schedule" hint="Nama internal untuk membedakan jadwal dalam event ini."><Input value={name} maxLength={120} onChange={event => { setName(event.target.value); setMessage('') }} placeholder="Mis. Roadshow November 2026" /></Field>
                    </fieldset>
                    <div role="tablist" aria-label="Pengaturan schedule" className="flex rounded-xl border border-border bg-card p-1">{([{ id: 'schedule', label: 'Kota & sesi' }, { id: 'appearance', label: 'Tampilan' }, { id: 'extras', label: 'Fitur tambahan' }] as const).map(item => <button key={item.id} type="button" role="tab" id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} onClick={() => setTab(item.id)} className={`min-h-10 flex-1 rounded-lg px-2 text-xs font-medium transition-colors sm:text-sm ${tab === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}>{item.label}</button>)}</div>
                    <fieldset disabled={!editable} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-w-0 space-y-4">
                        {tab === 'schedule' && <>
                            <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{doc.cities.length} kota · {doc.cities.reduce((sum, city) => sum + city.sessions.length, 0)} sesi</p><Button type="button" variant="outline" size="sm" disabled={doc.cities.length >= 40} onClick={() => change('cities', [...doc.cities, newCity()])}><Plus className="mr-1.5 h-4 w-4" />Tambah kota</Button></div>
                            {doc.cities.map((city, index) => <CityEditor key={city.id} city={city} index={index} total={doc.cities.length} onChange={next => change('cities', doc.cities.map(item => item.id === city.id ? next : item))} onDuplicate={() => change('cities', [...doc.cities.slice(0, index + 1), duplicateCity(city), ...doc.cities.slice(index + 1)])} onRemove={() => change('cities', doc.cities.filter(item => item.id !== city.id))} onMove={direction => { const cities = [...doc.cities], target = index + direction; [cities[index], cities[target]] = [cities[target], cities[index]]; change('cities', cities) }} />)}
                            {!doc.cities.length && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Tambahkan kota pertama untuk mulai menyusun jadwal.</p>}
                        </>}
                        {tab === 'appearance' && <AppearanceEditor doc={doc} onChange={setDoc} />}
                        {tab === 'extras' && <>
                            <Panel title="Countdown diskon"><CountdownEditor value={doc.countdown} onChange={value => change('countdown', value)} /></Panel>
                            <Panel title="Animasi di atas jadwal"><AnimationEditor value={doc.animation} onChange={value => change('animation', value)} /></Panel>
                            <Panel title="Aturan penayangan"><Toggle label="Sembunyikan sesi yang sudah lewat" hint="Mengikuti jam selesai. Jika kosong, sesi tampil sampai akhir hari sesuai zona waktunya." checked={doc.hidePast} onChange={value => change('hidePast', value)} /><Field label="Urutan kota dan sesi"><Select value={doc.sort} onChange={value => change('sort', value as ScheduleDocument['sort'])}><option value="manual">Manual — sesuai urutan editor</option><option value="date">Tanggal terdekat lebih dahulu</option></Select></Field><Field label="Pesan saat jadwal kosong"><Input value={doc.emptyMessage} maxLength={300} onChange={event => change('emptyMessage', event.target.value)} /></Field></Panel>
                        </>}
                    </fieldset>
                    {record && canManage && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3"><Button variant="ghost" size="sm" disabled={pending} onClick={duplicate}><Copy className="mr-2 h-4 w-4" />Duplikat schedule</Button>{!archived && <Button variant="ghost" size="sm" disabled={pending} onClick={() => changeStatus('archive')} title="Menghentikan penayangan embed"><Archive className="mr-2 h-4 w-4" />Arsipkan</Button>}{record.status === 'published' && <Button variant="ghost" size="sm" disabled={pending} onClick={() => changeStatus('unpublish')} className="text-destructive">Hentikan publikasi</Button>}<Button variant="ghost" size="sm" disabled={pending} onClick={remove} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Hapus schedule</Button></div>}
                </div>
                <div className="min-w-0 space-y-5 xl:sticky xl:top-6"><SchedulePreview document={doc} scheduleId={record?.id} /><LinkTester document={doc} /></div>
            </div>
            {showEmbed && record && <EmbedDialog id={record.id} name={record.name} cities={record.publishedCities || []} onClose={() => setShowEmbed(false)} />}
        </div>
    </NavigationLayout>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-5"><h2 className="border-b border-border pb-3 text-sm font-semibold">{title}</h2>{children}</section>
}

function AppearanceEditor({ doc, onChange }: { doc: ScheduleDocument; onChange: (value: ScheduleDocument) => void }) {
    const cta = <K extends keyof ScheduleDocument['cta']>(key: K, value: ScheduleDocument['cta'][K]) => onChange({ ...doc, cta: { ...doc.cta, [key]: value } })
    return <>
        <TemplateEditor value={doc.theme} onChange={theme => onChange({ ...doc, theme })} />
        <Panel title="Judul section"><Field label="Judul publik (opsional)"><Input value={doc.heading} maxLength={180} placeholder="Pilih Jadwal Seminar Anda" onChange={event => onChange({ ...doc, heading: event.target.value })} /></Field><Field label="Subjudul (opsional)"><Textarea value={doc.subtitle} maxLength={300} rows={2} onChange={event => onChange({ ...doc, subtitle: event.target.value })} /></Field><Field label="Awalan judul kota"><Input value={doc.cityPrefix} maxLength={60} placeholder="Jadwal" onChange={event => onChange({ ...doc, cityPrefix: event.target.value })} /></Field></Panel>
        <Panel title="Custom CTA"><Field label="Teks tombol default" hint="Bisa menggunakan {city} dan {session}. Teks per sesi dapat diatur pada tab Kota & sesi."><Input value={doc.cta.label} maxLength={120} onChange={event => cta('label', event.target.value)} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Teks sold out"><Input value={doc.cta.soldOutLabel} maxLength={120} onChange={event => cta('soldOutLabel', event.target.value)} /></Field><Field label="Teks ditutup"><Input value={doc.cta.closedLabel} maxLength={120} onChange={event => cta('closedLabel', event.target.value)} /></Field></div><Toggle label="Buka checkout di tab baru" checked={doc.cta.newTab} onChange={value => cta('newTab', value)} /><Toggle label="Animasi penekanan tombol" checked={doc.cta.pulse} onChange={value => cta('pulse', value)} /></Panel>
    </>
}

function AnimationEditor({ value, onChange }: { value: ScheduleDocument['animation']; onChange: (value: ScheduleDocument['animation']) => void }) {
    const [error, setError] = useState('')
    const change = <K extends keyof ScheduleDocument['animation']>(key: K, next: ScheduleDocument['animation'][K]) => onChange({ ...value, [key]: next })
    const upload = async (file?: File) => {
        if (!file) return
        setError('')
        try {
            let data: string
            const image = ['image/gif', 'image/png', 'image/webp'].includes(file.type)
            if (file.size > (image ? 145_000 : MAX_ANIMATION_BYTES)) throw new Error(image ? 'Gambar maksimal 145 KB.' : 'Lottie JSON maksimal 200 KB.')
            if (image) data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('File gagal dibaca.')); reader.readAsDataURL(file) })
            else data = await file.text()
            validateAnimationUpload(data)
            onChange({ ...value, mode: image ? 'image' : 'lottie', upload: data, url: '' })
        } catch (error) { setError(error instanceof Error ? error.message : 'File tidak valid.') }
    }
    return <div className="space-y-4"><Field label="Sumber animasi"><Select value={value.mode} onChange={mode => onChange({ ...value, mode: mode as ScheduleDocument['animation']['mode'], upload: '', url: '' })}><option value="off">Nonaktif</option><option value="arrows">Preset panah bergerak</option><option value="lottie">Lottie JSON — upload / URL</option><option value="image">GIF / PNG / WebP — upload / URL</option></Select></Field>
        {value.mode !== 'off' && <>
            {(value.mode === 'lottie' || value.mode === 'image') && <><Field label="URL aset animasi" hint={value.mode === 'lottie' ? 'Gunakan URL langsung file .json dari Lottie, bukan link halaman preview.' : 'Gunakan URL langsung gambar GIF, PNG, atau WebP.'}><Input type="url" value={value.url} disabled={!!value.upload} placeholder="https://…" onChange={event => change('url', event.target.value)} /></Field><div className="rounded-xl border border-dashed border-border p-4"><label className="block cursor-pointer text-sm"><span className="mb-2 flex items-center gap-2 font-medium"><Upload className="h-4 w-4" />Atau upload animasi</span><input aria-label="Upload animasi jadwal" type="file" accept={value.mode === 'lottie' ? '.json,application/json' : '.gif,.png,.webp,image/gif,image/png,image/webp'} className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground" onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label><p className="mt-2 text-xs text-muted-foreground">{value.mode === 'lottie' ? 'Lottie JSON maksimal 200 KB.' : 'Gambar maksimal 145 KB.'} File tersimpan bersama schedule.</p>{value.upload && <div className="mt-3 flex items-center justify-between gap-2 text-xs text-success"><span>File siap digunakan</span><Button type="button" variant="ghost" size="sm" onClick={() => change('upload', '')}><X className="mr-1 h-3 w-3" />Hapus file</Button></div>}</div></>}
            <div className="grid grid-cols-2 gap-3"><Field label="Ukuran (px)"><Input type="number" min={32} max={240} value={value.size} onChange={event => change('size', Number(event.target.value))} /></Field><Field label="Jumlah animasi"><Input type="number" min={1} max={5} value={value.count} onChange={event => change('count', Number(event.target.value))} /></Field></div>
        </>}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
}

function LinkTester({ document }: { document: ScheduleDocument }) {
    const [lp, setLp] = useState('https://contoh.id/seminar?utm_source=facebook&utm_medium=paid_social&utm_campaign=seminar')
    const [selected, setSelected] = useState('')
    const sessions = document.cities.flatMap(city => city.sessions.map((session, index) => ({ ...session, label: `${city.name || 'Kota'} · ${session.name || `Sesi ${index + 1}`}` })))
    const session = sessions.find(item => item.id === selected) || sessions[0]
    let search = ''
    try { search = new URL(lp).search } catch { /* Invalid simulation URLs show validation feedback below. */ }
    const result = session?.checkoutUrl ? buildTrackedUrl(session.checkoutUrl, search) : ''
    return <details className="rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">Periksa link & UTM</summary><div className="mt-4 space-y-4"><Field label="URL LP untuk simulasi"><Input type="url" value={lp} onChange={event => setLp(event.target.value)} /></Field><Field label="Sesi tujuan"><Select value={session?.id || ''} onChange={setSelected}>{sessions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field><Field label="Hasil link checkout" hint="Parameter link OO tetap dipertahankan. UTM dari LP menggantikan parameter tracking dengan nama yang sama."><Textarea readOnly value={result || 'Isi link OO sesi terlebih dahulu.'} rows={4} className="font-mono text-xs" /></Field><p className="text-xs leading-5 text-muted-foreground">Widget juga meneruskan fbclid dan cookie fbp/fbc yang tersedia pada LP. Pencatatan akhir di order mengikuti konfigurasi tracking OO.</p></div></details>
}
