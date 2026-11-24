'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Check, Copy, Loader2, Monitor, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { embedCode } from '@/lib/schedules/model'
import { getSchedule } from '@/app/actions/schedules'
import type { ScheduleCity, ScheduleDocument, ScheduleWidget } from '@/lib/schedules/types'

let widgetPromise: Promise<ScheduleWidget> | undefined
const subscribeOrigin = () => () => {}
function loadWidget(): Promise<ScheduleWidget> {
    if (window.DivinationSchedules) return Promise.resolve(window.DivinationSchedules)
    if (!widgetPromise) widgetPromise = new Promise<ScheduleWidget>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = '/embed/schedule.js'
        script.async = true
        script.onload = () => window.DivinationSchedules ? resolve(window.DivinationSchedules) : reject(new Error('Widget tidak tersedia.'))
        script.onerror = () => reject(new Error('Preview gagal dimuat. Muat ulang halaman.'))
        document.head.append(script)
    }).catch(error => { widgetPromise = undefined; throw error })
    return widgetPromise
}

export function SchedulePreview({ document, scheduleId }: { document: ScheduleDocument; scheduleId?: string }) {
    const host = useRef<HTMLDivElement>(null)
    const [mobile, setMobile] = useState(false)
    const [error, setError] = useState('')
    const [ready, setReady] = useState(false)
    useEffect(() => {
        let cancelled = false, cleanup: (() => void) | undefined
        loadWidget().then(widget => {
            if (cancelled || !host.current) return
            cleanup = widget.render(host.current, document, { preview: true, key: scheduleId || 'editor' })
            setReady(true)
        }).catch(error => { if (!cancelled) setError(error.message) })
        return () => { cancelled = true; cleanup?.() }
    }, [document, scheduleId])
    return <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div><h2 className="text-sm font-semibold">Live preview</h2><p className="mt-0.5 text-xs text-muted-foreground">Perubahan tampil di LP setelah Publish.</p></div><div className="flex gap-1"><Button type="button" size="icon" variant={mobile ? 'ghost' : 'outline'} aria-label="Preview desktop" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor className="h-4 w-4" /></Button><Button type="button" size="icon" variant={mobile ? 'outline' : 'ghost'} aria-label="Preview mobile" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone className="h-4 w-4" /></Button></div></div>
        {error && <p role="alert" className="p-4 text-sm text-destructive">{error}</p>}
        {!ready && !error && <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat preview…</p>}
        <div className="max-h-[75vh] overflow-auto bg-muted/40 p-3"><div className={`mx-auto overflow-hidden transition-[max-width] ${mobile ? 'max-w-[375px] shadow-lg' : 'max-w-full'}`}><div ref={host} /></div></div>
        <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">Tombol pendaftaran dinonaktifkan dalam preview. Tanggal yang sudah lewat mengikuti pengaturan penayangan.</p>
    </section>
}

export function EmbedDialog({ id, name, cities = [], onClose }: { id: string; name: string; cities?: Pick<ScheduleCity, 'id' | 'name'>[]; onClose: () => void }) {
    const [city, setCity] = useState('')
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState('')
    const [mode, setMode] = useState<'live' | 'raw'>('live')
    const [published, setPublished] = useState<ScheduleDocument | null>(null)
    const [rawCode, setRawCode] = useState('')
    const [loading, setLoading] = useState(false)
    const ref = useRef<HTMLDialogElement>(null)
    const origin = useSyncExternalStore(subscribeOrigin, () => window.location.origin, () => '')
    useEffect(() => { ref.current?.showModal() }, [])
    const code = mode === 'raw' ? rawCode : origin ? embedCode(origin, id, city) : ''
    const availableCities = published?.cities ?? cities
    const chooseRaw = async () => {
        setMode('raw'); setCopied(false); setError(''); setLoading(true); setPublished(null); setRawCode('')
        try {
            const [result, widget] = await Promise.all([getSchedule(id), loadWidget()])
            if (!result.success) { setError(result.error); return }
            const schedule = result.data.schedule
            if (schedule.status !== 'published' || !schedule.publishedDocument) { setError('Jadwal belum dipublish.'); return }
            const document = schedule.publishedDocument
            const selectedCity = document.cities.some(item => item.id === city) ? city : ''
            setRawCode(widget.exportHtml(document, id, selectedCity))
            setPublished(document)
            setCity(selectedCity)
        } catch { setError('Gagal membuat HTML mandiri. Muat ulang halaman dan coba lagi.') }
        finally { setLoading(false) }
    }
    const selectCity = (value: string) => {
        setCity(value); setCopied(false); setError('')
        if (mode === 'raw' && published) {
            try { setRawCode(window.DivinationSchedules!.exportHtml(published, id, value)) }
            catch { setRawCode(''); setError('Gagal membuat HTML mandiri. Coba lagi.') }
        }
    }
    const copy = async () => {
        try { await navigator.clipboard.writeText(code); setCopied(true); setError('') }
        catch { setError('Salin kode secara manual dari kotak di bawah.') }
    }
    return <dialog ref={ref} aria-label="Pasang jadwal di landing page" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-overlay/60">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5"><div><h2 className="font-semibold">Pasang di landing page</h2><p className="mt-1 text-sm text-muted-foreground">{name}</p></div><Button variant="ghost" size="icon" aria-label="Tutup kode embed" onClick={onClose}><X className="h-5 w-5" /></Button></div>
        <div className="space-y-4 p-5"><div className="flex gap-2"><Button disabled={loading} variant={mode === 'live' ? 'default' : 'outline'} onClick={() => { setMode('live'); setError(''); setCopied(false) }}>Embed otomatis</Button><Button disabled={loading} variant={mode === 'raw' ? 'default' : 'outline'} onClick={chooseRaw}>HTML mandiri</Button></div>
            <p className="text-sm leading-6 text-muted-foreground">{mode === 'live' ? 'Tempel ke HTML widget Elementor. Jadwal mengikuti versi published secara otomatis.' : 'Tempel satu potongan kode ke HTML widget Elementor. Edit tanggal, jam, venue, atau link langsung di bagian sesi. Untuk sold out, ubah data-status dari open ke sold_out.'}</p>
            {availableCities.length > 1 && <label className="block space-y-2 text-sm font-medium"><span>Kota yang ditampilkan</span><select value={city} disabled={loading} onChange={event => selectCity(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3"><option value="">Semua kota</option>{availableCities.map(item => <option key={item.id} value={item.id}>{item.name || 'Kota tanpa nama'}</option>)}</select></label>}
            <textarea aria-label="Kode embed schedule" readOnly value={code} rows={mode === 'raw' ? 12 : 5} className="w-full resize-none rounded-xl border border-input bg-muted p-4 font-mono text-xs leading-6" onFocus={event => event.target.select()} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={!code || loading} onClick={copy}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{loading ? 'Memuat…' : copied ? 'Kode tersalin' : 'Salin kode embed'}</Button>
        </div>
    </dialog>
}
