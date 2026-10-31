'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CheckCircle2, KeyRound, Loader2, Pencil, Plug, Plus, Power, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NavigationLayout } from '@/components/ui/nav-layout'
import { disconnectConnectedApp, recheckConnectedApp, renameConnectedApp } from '@/app/actions/connected-apps'
import type { ConnectedApp } from '@/lib/integrations/types'
import { ConnectionDialog } from './connection-dialog'
import { ConnectionEditor } from './connection-editor'
import { ConnectionProfileDetails } from './connection-profile'

type Dialog = { kind: 'profile' | 'rename' | 'replace' | 'disconnect'; id: string } | { kind: 'add' } | null
const STATUS = {
    connected: { label: 'Terhubung', style: 'bg-success/10 text-success' },
    needs_attention: { label: 'Perlu diperiksa', style: 'bg-warning/10 text-warning' },
    disconnected: { label: 'Terputus', style: 'bg-muted text-muted-foreground' },
}

function date(value: string | null): string {
    if (!value) return 'Belum pernah'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB'
}

export function ConnectedAppsClient({ connections, loadError }: { connections: ConnectedApp[]; loadError?: string }) {
    const router = useRouter()
    const [dialog, setDialog] = useState<Dialog>(null)
    const [name, setName] = useState('')
    const [pending, setPending] = useState<string | null>(null)
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
    const selected = dialog && dialog.kind !== 'add' ? connections.find(item => item.id === dialog.id) : undefined
    const busy = pending !== null
    const activeCount = connections.filter(item => item.status !== 'disconnected').length

    function open(kind: 'profile' | 'rename' | 'replace' | 'disconnect', item: ConnectedApp) {
        setMessage(null)
        setName(item.name)
        setDialog({ kind, id: item.id })
    }

    async function mutate(action: 'recheck' | 'rename' | 'disconnect', item: ConnectedApp) {
        if (busy) return
        setPending(item.id)
        setMessage(null)
        try {
            const result = action === 'recheck' ? await recheckConnectedApp(item.id, item.version)
                : action === 'rename' ? await renameConnectedApp(item.id, item.version, name)
                    : await disconnectConnectedApp(item.id, item.version)
            if (result.success) {
                setMessage({ text: action === 'recheck' ? 'Koneksi berhasil diperiksa.' : action === 'rename' ? 'Nama koneksi diperbarui.' : 'Koneksi diputuskan dan API key dihapus dari Divination.', error: false })
                if (action !== 'recheck') setDialog(null)
            } else setMessage({ text: result.error, error: true })
            router.refresh()
        } catch {
            setMessage({ text: 'Permintaan gagal. Periksa koneksi internet lalu coba lagi.', error: true })
        } finally {
            setPending(null)
        }
    }

    function feedback() {
        return message ? <p role={message.error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${message.error ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-success/20 bg-success/10 text-success'}`}>{message.text}</p> : null
    }

    return (
        <NavigationLayout isAdmin>
            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-28 md:p-8">
                <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Pengaturan</Link>
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Integrasi aplikasi</p>
                        <h1 className="text-3xl font-bold tracking-tight">Connected Apps</h1>
                        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Kelola akun dan API key yang terhubung ke Divination.</p>
                    </div>
                    <Button onClick={() => { setMessage(null); setDialog({ kind: 'add' }) }} disabled={busy || !!loadError}><Plus className="mr-2 h-4 w-4" />Add New API Key</Button>
                </header>

                <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-muted-foreground">Koneksi dibagikan kepada seluruh <span className="font-medium text-foreground">admin dan developer</span>. API key disimpan terenkripsi.</p>
                </div>
                {!selected && feedback()}
                {loadError ? (
                    <div role="alert" className="rounded-xl border border-destructive/20 bg-card p-6"><p className="text-sm text-destructive">{loadError}</p><Button variant="outline" className="mt-4" onClick={() => router.refresh()}>Coba lagi</Button></div>
                ) : connections.length === 0 ? (
                    <section className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Plug className="h-8 w-8" /></span>
                        <h2 className="text-lg font-semibold">Belum ada aplikasi terhubung</h2>
                        <p className="mb-6 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Tambahkan API key OrderOnline, periksa profil akun, lalu simpan koneksinya.</p>
                        <Button variant="outline" onClick={() => setDialog({ kind: 'add' })}><Plus className="mr-2 h-4 w-4" />Hubungkan aplikasi pertama</Button>
                    </section>
                ) : (
                    <section aria-label="Daftar koneksi" className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground"><span className="font-medium uppercase tracking-wider">Koneksi tersimpan</span><span>{activeCount} aktif · {connections.length} total</span></div>
                        {connections.map(item => (
                            <article key={item.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">OO</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-semibold">{item.name}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[item.status].style}`}>{STATUS[item.status].label}</span></div>
                                        <p className="mt-1 break-words text-sm text-muted-foreground">OrderOnline · {item.profile.username || item.profile.name || item.profile.user_id}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" disabled={busy} onClick={() => open('profile', item)} aria-label={`Lihat profil ${item.name}`}><ArrowUpRight className="h-4 w-4" /></Button>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /><span className="font-mono">{item.key_hint || 'API key dihapus'}</span></span>
                                    <span>Verifikasi terakhir: {date(item.last_verified_at)}</span>
                                </div>
                                {item.status !== 'disconnected' && item.last_check_outcome && item.last_check_outcome !== 'success' && <p className="mt-3 text-xs text-warning">Pemeriksaan terakhir gagal. Profil yang ditampilkan berasal dari verifikasi sebelumnya.</p>}
                                <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
                                    {item.status !== 'disconnected' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void mutate('recheck', item)}>{pending === item.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}Recheck</Button>}
                                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => open('rename', item)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Rename</Button>
                                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => open('replace', item)}><KeyRound className="mr-1.5 h-3.5 w-3.5" />{item.status === 'disconnected' ? 'Hubungkan kembali' : 'Replace key'}</Button>
                                    {item.status !== 'disconnected' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => open('disconnect', item)} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Power className="mr-1.5 h-3.5 w-3.5" />Disconnect</Button>}
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                {dialog?.kind === 'add' && <ConnectionEditor onClose={() => setDialog(null)} onSaved={() => { setDialog(null); setMessage({ text: 'API key dan profil akun berhasil disimpan.', error: false }); router.refresh() }} />}
                {dialog?.kind === 'replace' && selected && <ConnectionEditor connection={selected} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); setMessage({ text: 'API key berhasil diperbarui.', error: false }); router.refresh() }} />}
                {dialog?.kind === 'profile' && selected && (
                    <ConnectionDialog title={selected.name} description={`Profil akun OrderOnline · ${STATUS[selected.status].label}`} busy={busy} onClose={() => setDialog(null)}>
                        <div className="space-y-4">
                            <ConnectionProfileDetails profile={selected.profile} />
                            <p className="text-xs text-muted-foreground">Verifikasi berhasil: {date(selected.last_verified_at)}<br />Pemeriksaan terakhir: {date(selected.last_checked_at)}</p>
                            {feedback()}
                            {selected.status !== 'disconnected' && <Button variant="outline" disabled={busy} onClick={() => void mutate('recheck', selected)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Recheck Connection</Button>}
                        </div>
                    </ConnectionDialog>
                )}
                {dialog?.kind === 'rename' && selected && (
                    <ConnectionDialog title="Rename Connection" description="Ubah nama koneksi untuk memudahkan identifikasi akun." busy={busy} onClose={() => setDialog(null)}>
                        <form onSubmit={event => { event.preventDefault(); void mutate('rename', selected) }} className="space-y-4">
                            <label htmlFor="rename-connection" className="block text-sm font-medium">Name</label>
                            <Input id="rename-connection" value={name} maxLength={100} required disabled={busy} onChange={event => setName(event.target.value)} />
                            {feedback()}
                            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={() => setDialog(null)}>Batal</Button><Button disabled={busy || !name.trim()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></div>
                        </form>
                    </ConnectionDialog>
                )}
                {dialog?.kind === 'disconnect' && selected && (
                    <ConnectionDialog title="Disconnect Connection" description={`Putuskan koneksi ${selected.name} dari Divination?`} busy={busy} onClose={() => setDialog(null)}>
                        <p className="text-sm leading-relaxed text-muted-foreground">API key akan dihapus dari Divination. Profil dan riwayat koneksi tetap disimpan. Tindakan ini tidak mencabut API key di OrderOnline.</p>
                        {feedback()}
                        <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setDialog(null)}>Batal</Button><Button disabled={busy} onClick={() => void mutate('disconnect', selected)} className="bg-destructive text-destructive-foreground hover:bg-destructive-hover">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Disconnect</Button></div>
                    </ConnectionDialog>
                )}
            </div>
        </NavigationLayout>
    )
}
