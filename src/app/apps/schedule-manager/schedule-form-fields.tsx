'use client'

import { Children, cloneElement, isValidElement, useId, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { indonesiaRegionSuggestions } from '@/lib/indonesia-regions'
import { duplicateSession, newCountdown, newSession, TIMEZONES } from '@/lib/schedules/model'
import type { CountdownSettings, ScheduleCity, ScheduleSession, SeatSettings } from '@/lib/schedules/types'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    const id = useId(), hintId = `${id}-hint`
    const items = Children.toArray(children)
    const controlIndex = items.findIndex(child => isValidElement(child))
    const controls = items.map((child, index) => index === controlIndex && isValidElement<{ id?: string; 'aria-describedby'?: string }>(child)
        ? cloneElement(child, { id, 'aria-describedby': hint ? hintId : undefined }) : child)
    return <div className="space-y-2 text-sm"><label htmlFor={id} className="block font-medium text-foreground">{label}</label>{controls}{hint && <p id={hintId} className="text-xs font-normal leading-5 text-muted-foreground">{hint}</p>}</div>
}

export function Select({ value, onChange, children, ...props }: {
    value: string; onChange: (value: string) => void; children: ReactNode
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'>) {
    return <select {...props} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground disabled:opacity-50">{children}</select>
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/50 p-3"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" /><span><span className="block text-sm font-medium">{label}</span>{hint && <span className="mt-1 block text-xs leading-5 text-muted-foreground">{hint}</span>}</span></label>
}

export function CountdownEditor({ value, onChange }: { value: CountdownSettings; onChange: (value: CountdownSettings) => void }) {
    const change = <K extends keyof CountdownSettings>(key: K, next: CountdownSettings[K]) => onChange({ ...value, [key]: next })
    return <div className="space-y-4">
        <Field label="Mode countdown"><Select value={value.mode} onChange={next => change('mode', next as CountdownSettings['mode'])}><option value="off">Nonaktif</option><option value="fixed">Tanggal dan jam tertentu</option><option value="evergreen">Durasi per pengunjung</option></Select></Field>
        {value.mode !== 'off' && <>
            {value.mode === 'fixed' ? <div className="grid gap-3 sm:grid-cols-2"><Field label="Diskon berakhir"><Input type="datetime-local" value={value.deadline} onChange={event => change('deadline', event.target.value)} /></Field><Field label="Zona waktu diskon"><Select value={value.timezone} onChange={next => change('timezone', next as CountdownSettings['timezone'])}>{TIMEZONES.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</Select></Field></div> : <Field label="Durasi (menit)" hint="Dihitung sejak kunjungan pertama pada browser ini. Refresh halaman tidak mengulang timer."><Input type="number" min={1} max={10080} value={value.minutes} onChange={event => change('minutes', Number(event.target.value))} /></Field>}
            <Field label="Teks di atas timer"><Input value={value.label} maxLength={150} onChange={event => change('label', event.target.value)} /></Field>
            <Field label="Saat waktu habis"><Select value={value.expiryAction} onChange={next => change('expiryAction', next as CountdownSettings['expiryAction'])}><option value="message">Tampilkan pesan</option><option value="hide_timer">Sembunyikan timer</option><option value="close_cta">Tutup CTA diskon</option></Select></Field>
            <Field label="Pesan waktu habis"><Input value={value.expiredText} maxLength={200} onChange={event => change('expiredText', event.target.value)} /></Field>
        </>}
    </div>
}

function SeatEditor({ value, onChange }: { value: SeatSettings; onChange: (value: SeatSettings) => void }) {
    const change = <K extends keyof SeatSettings>(key: K, next: SeatSettings[K]) => onChange({ ...value, [key]: next })
    return <div className="space-y-3">
        <Field label="Informasi kursi"><Select value={value.mode} onChange={next => change('mode', next as SeatSettings['mode'])}><option value="off">Tidak ditampilkan</option><option value="actual">Kuota aktual — pencatatan manual</option><option value="manual">Angka tampilan / gimmick</option></Select></Field>
        {value.mode !== 'off' && <>
            <p className="text-xs leading-5 text-muted-foreground">{value.mode === 'actual' ? 'Sisa dihitung dari kapasitas dikurangi kursi terpakai. Sisa nol otomatis menutup CTA. Belum tersinkron dengan penjualan OO.' : 'Angka diatur sendiri untuk tampilan. Tidak mengubah status pendaftaran atau mengikuti transaksi OO.'}</p>
            <div className="grid grid-cols-2 gap-3"><Field label="Kapasitas"><Input type="number" min={1} max={1000000} value={value.capacity} onChange={event => change('capacity', Number(event.target.value))} /></Field>{value.mode === 'actual' ? <Field label="Kursi terpakai"><Input type="number" min={0} max={value.capacity} value={value.booked} onChange={event => change('booked', Number(event.target.value))} /></Field> : <Field label="Sisa yang ditampilkan"><Input type="number" min={0} max={value.capacity} value={value.remaining} onChange={event => change('remaining', Number(event.target.value))} /></Field>}</div>
            <Field label="Label kursi" hint="Gunakan {remaining} untuk jumlah kursi tersisa."><Input value={value.label} maxLength={150} onChange={event => change('label', event.target.value)} /></Field>
            <Toggle label="Tampilkan progress bar" checked={value.showProgress} onChange={next => change('showProgress', next)} />
        </>}
    </div>
}

export function CityEditor({ city, index, total, onChange, onDuplicate, onRemove, onMove }: {
    city: ScheduleCity; index: number; total: number; onChange: (value: ScheduleCity) => void
    onDuplicate: () => void; onRemove: () => void; onMove: (direction: number) => void
}) {
    const listId = useId()
    const suggestions = city.name.trim().length >= 2 ? indonesiaRegionSuggestions.filter(item => item.detail !== 'Provinsi' && `${item.value} ${item.detail}`.toLocaleLowerCase('id-ID').includes(city.name.toLocaleLowerCase('id-ID'))).slice(0, 12) : []
    const updateSession = (id: string, next: ScheduleSession) => onChange({ ...city, sessions: city.sessions.map(session => session.id === id ? next : session) })
    return <details open className="group rounded-2xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{city.name || 'Kota baru'}</h3><p className="mt-0.5 text-xs text-muted-foreground">{city.sessions.length} sesi</p></div></div><span className="text-xs text-muted-foreground group-open:hidden">Buka</span></summary>
        <div className="space-y-4 border-t border-border p-4">
            <div className="flex flex-wrap justify-end gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Naikkan kota ${index + 1}`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Turunkan kota ${index + 1}`} disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="sm" disabled={total >= 40} onClick={onDuplicate}><Copy className="mr-1.5 h-4 w-4" />Duplikat kota</Button><Button type="button" variant="ghost" size="icon" aria-label={`Hapus kota ${index + 1}`} className="text-destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Kota / kabupaten" hint="Ketik nama kota untuk autocomplete. Nama tetap bisa disesuaikan."><Input list={listId} autoComplete="off" value={city.name} maxLength={120} placeholder="Cari kota, mis. Malang" onChange={event => {
                const match = indonesiaRegionSuggestions.find(item => item.value === event.target.value)
                onChange({ ...city, name: event.target.value, province: match?.detail.split('·')[1]?.trim() || city.province })
            }} /><datalist id={listId}>{suggestions.map(item => <option key={`${item.value}-${item.detail}`} value={item.value}>{item.detail}</option>)}</datalist></Field><Field label="Provinsi"><Input value={city.province} maxLength={100} onChange={event => onChange({ ...city, province: event.target.value })} placeholder="Terisi saat memilih kota" /></Field></div>
            {city.sessions.map((session, sessionIndex) => <SessionEditor key={session.id} session={session} index={sessionIndex} total={city.sessions.length} onChange={next => updateSession(session.id, next)} onRemove={() => onChange({ ...city, sessions: city.sessions.filter(item => item.id !== session.id) })} onDuplicate={() => onChange({ ...city, sessions: [...city.sessions.slice(0, sessionIndex + 1), duplicateSession(session), ...city.sessions.slice(sessionIndex + 1)] })} onMove={direction => { const sessions = [...city.sessions], target = sessionIndex + direction; [sessions[sessionIndex], sessions[target]] = [sessions[target], sessions[sessionIndex]]; onChange({ ...city, sessions }) }} />)}
            <Button type="button" variant="outline" className="w-full border-dashed" disabled={city.sessions.length >= 30} onClick={() => onChange({ ...city, sessions: [...city.sessions, newSession()] })}><Plus className="mr-2 h-4 w-4" />Tambah sesi</Button>
        </div>
    </details>
}

function SessionEditor({ session, index, total, onChange, onRemove, onDuplicate, onMove }: {
    session: ScheduleSession; index: number; total: number; onChange: (value: ScheduleSession) => void
    onRemove: () => void; onDuplicate: () => void; onMove: (direction: number) => void
}) {
    const change = <K extends keyof ScheduleSession>(key: K, value: ScheduleSession[K]) => onChange({ ...session, [key]: value })
    return <div className="space-y-4 rounded-xl border border-border bg-background/60 p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sesi {index + 1}</h4><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Naikkan sesi ${index + 1}`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Turunkan sesi ${index + 1}`} disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Duplikat sesi ${index + 1}`} disabled={total >= 30} onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Hapus sesi ${index + 1}`} className="text-destructive" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Nama sesi (opsional)"><Input value={session.name} maxLength={100} placeholder={`Sesi ${index + 1}`} onChange={event => change('name', event.target.value)} /></Field><Field label="Status pendaftaran"><Select value={session.status} onChange={value => change('status', value as ScheduleSession['status'])}><option value="open">Dibuka</option><option value="sold_out">Sold out</option><option value="closed">Ditutup</option><option value="cancelled">Dibatalkan</option></Select></Field></div>
        <Field label="Tanggal seminar"><Input type="date" value={session.date} onChange={event => change('date', event.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-2"><Field label="Jam mulai"><Input type="time" value={session.time} onChange={event => change('time', event.target.value)} /></Field><Field label="Selesai (opsional)"><Input type="time" value={session.endTime} onChange={event => change('endTime', event.target.value)} /></Field><Field label="Zona waktu"><Select value={session.timezone} onChange={value => change('timezone', value as ScheduleSession['timezone'])}>{TIMEZONES.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</Select></Field></div>
        <Field label="Venue"><Input value={session.venue} maxLength={180} placeholder="Hotel / lokasi seminar" onChange={event => change('venue', event.target.value)} /></Field>
        <Field label="Alamat"><Textarea rows={2} value={session.address} maxLength={400} placeholder="Alamat lengkap venue" onChange={event => change('address', event.target.value)} /></Field>
        <Field label="Link checkout OO" hint="Gunakan link khusus kota dan sesi ini. UTM dari LP diteruskan otomatis."><Input type="url" value={session.checkoutUrl} maxLength={2048} placeholder="https://…orderonline.id/…" onChange={event => change('checkoutUrl', event.target.value)} /></Field>
        <Field label="Custom CTA sesi (opsional)" hint="Kosongkan untuk memakai CTA schedule. Mendukung {city} dan {session}."><Input value={session.ctaLabel} maxLength={120} placeholder="Ikuti pengaturan CTA schedule" onChange={event => change('ctaLabel', event.target.value)} /></Field>
        <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Kursi & countdown sesi</summary><div className="mt-4 space-y-5"><SeatEditor value={session.seats} onChange={value => change('seats', value)} /><Toggle label="Countdown khusus sesi" hint="Timer ini muncul di sesi. Countdown schedule tetap berlaku untuk seluruh jadwal." checked={session.countdown !== null} onChange={checked => change('countdown', checked ? newCountdown() : null)} />{session.countdown && <CountdownEditor value={session.countdown} onChange={value => change('countdown', value)} />}</div></details>
    </div>
}
