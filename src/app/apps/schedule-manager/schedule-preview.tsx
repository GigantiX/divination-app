'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Check, Copy, Loader2, Monitor, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { embedCode } from '@/lib/schedules/model'
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
    const ref = useRef<HTMLDialogElement>(null)
    const origin = useSyncExternalStore(subscribeOrigin, () => window.location.origin, () => '')
    useEffect(() => { ref.current?.showModal() }, [])
    const code = origin ? embedCode(origin, id, city) : ''
    const copy = async () => {
        try { await navigator.clipboard.writeText(code); setCopied(true); setError('') }
        catch { setError('Salin kode secara manual dari kotak di bawah.') }
    }
    return <dialog ref={ref} aria-label="Pasang jadwal di landing page" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-overlay/60">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5"><div><h2 className="font-semibold">Pasang di landing page</h2><p className="mt-1 text-sm text-muted-foreground">{name}</p></div><Button variant="ghost" size="icon" aria-label="Tutup kode embed" onClick={onClose}><X className="h-5 w-5" /></Button></div>
        <div className="space-y-4 p-5"><p className="text-sm leading-6 text-muted-foreground">Tempel kode ini ke HTML widget Elementor. Jadwal mengikuti versi published tanpa perlu mengganti kode.</p>
            {cities.length > 1 && <label className="block space-y-2 text-sm font-medium"><span>Kota yang ditampilkan</span><select value={city} onChange={event => { setCity(event.target.value); setCopied(false) }} className="h-10 w-full rounded-lg border border-input bg-background px-3"><option value="">Semua kota</option>{cities.map(item => <option key={item.id} value={item.id}>{item.name || 'Kota tanpa nama'}</option>)}</select></label>}
            <textarea aria-label="Kode embed schedule" readOnly value={code} rows={5} className="w-full resize-none rounded-xl border border-input bg-muted p-4 font-mono text-xs leading-6" onFocus={event => event.target.select()} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={copy}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? 'Kode tersalin' : 'Salin kode embed'}</Button>
        </div>
    </dialog>
}
