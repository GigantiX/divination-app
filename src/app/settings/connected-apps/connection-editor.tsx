'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { checkConnectedApp, saveConnectedApp } from '@/app/actions/connected-apps'
import { CONNECTED_APP_PROVIDERS, type CheckedConnection, type ConnectedApp } from '@/lib/integrations/types'
import { ConnectionDialog } from './connection-dialog'
import { ConnectionProfileDetails } from './connection-profile'

export function ConnectionEditor({ connection, onClose, onSaved }: {
    connection?: ConnectedApp
    onClose: () => void
    onSaved: () => void
}) {
    const [provider, setProvider] = useState(connection ? 'orderonline' : '')
    const [name, setName] = useState(connection?.name || '')
    const [apiKey, setApiKey] = useState('')
    const [visible, setVisible] = useState(false)
    const [checked, setChecked] = useState<CheckedConnection | null>(null)
    const [expired, setExpired] = useState(false)
    const [pending, setPending] = useState<'check' | 'save' | null>(null)
    const [error, setError] = useState<string | null>(null)
    const busy = pending !== null
    const canCheck = provider === 'orderonline' && name.trim().length > 0 && name.trim().length <= 100 && apiKey.trim().length > 0 && !busy

    useEffect(() => {
        if (!checked) return
        const timer = setTimeout(() => setExpired(true), Math.max(0, checked.expiresAt - Date.now()))
        return () => clearTimeout(timer)
    }, [checked])

    function invalidate() {
        setChecked(null)
        setExpired(false)
        setError(null)
    }

    function candidate() {
        return { provider, name, apiKey, ...(connection ? { connectionId: connection.id, version: connection.version } : {}) }
    }

    async function check() {
        if (!canCheck) return
        invalidate()
        setPending('check')
        try {
            const result = await checkConnectedApp(candidate())
            if (result.success) setChecked(result.data)
            else setError(result.error)
        } catch {
            setError('Pemeriksaan gagal. Periksa koneksi internet lalu coba lagi.')
        } finally {
            setPending(null)
        }
    }

    async function save() {
        if (!checked || expired || busy || !name.trim()) return
        if (checked.expiresAt <= Date.now()) { setExpired(true); return }
        setError(null)
        setPending('save')
        try {
            const result = await saveConnectedApp({ ...candidate(), receipt: checked.receipt })
            if (result.success) {
                setApiKey('')
                setChecked(null)
                onSaved()
            } else {
                setError(result.error)
                if (['verification_expired', 'identity_mismatch', 'conflict', 'invalid_credentials'].includes(result.code)) setChecked(null)
            }
        } catch {
            setError('Penyimpanan gagal. Silakan coba lagi.')
        } finally {
            setPending(null)
        }
    }

    return (
        <ConnectionDialog
            title={connection ? connection.status === 'disconnected' ? 'Hubungkan Kembali' : 'Replace API Key' : 'Add New API Key'}
            description={connection ? `Periksa API key baru untuk ${connection.name} sebelum menyimpannya.` : 'Pilih aplikasi, lalu periksa API key Anda.'}
            busy={busy}
            onClose={onClose}
        >
            <form onSubmit={event => { event.preventDefault(); void (checked && !expired ? save() : check()) }} className="space-y-5">
                {!connection && (
                    <fieldset disabled={busy}>
                        <legend className="mb-2 text-sm font-medium">Pilih aplikasi</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {CONNECTED_APP_PROVIDERS.map(app => (
                                <button
                                    type="button" key={app.id} disabled={!app.enabled}
                                    aria-pressed={provider === app.id}
                                    onClick={() => { setProvider(app.id); invalidate() }}
                                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 ${provider === app.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                                >
                                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">{app.initials}</span>
                                    <span className="min-w-0 text-sm font-medium">{app.name}{!app.enabled && <span className="block text-xs font-normal text-muted-foreground">Coming soon</span>}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>
                )}

                {provider && (
                    <>
                        <div className="space-y-2">
                            <label htmlFor="connection-name" className="text-sm font-medium">Name</label>
                            <Input id="connection-name" value={name} maxLength={100} required disabled={busy} placeholder="Contoh: OrderOnline — ContentHack" onChange={event => setName(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor="connection-api-key" className="text-sm font-medium">API Key</label>
                                <a href="https://app.orderonline.id/settings/api-keys" target="_blank" rel="noreferrer" className="text-xs text-primary underline underline-offset-2">Dapatkan API key</a>
                            </div>
                            <div className="relative">
                                <Input id="connection-api-key" type={visible ? 'text' : 'password'} value={apiKey} required maxLength={8192} autoComplete="off" spellCheck={false} autoCapitalize="none" disabled={busy} className="pr-12 font-mono" placeholder="Masukkan personal access token" onChange={event => { setApiKey(event.target.value); invalidate() }} />
                                <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={() => setVisible(!visible)} aria-label={visible ? 'Sembunyikan API key' : 'Tampilkan API key'} className="absolute right-1 top-1">
                                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="mt-0.5 h-3 w-3 shrink-0" />API key disimpan terenkripsi setelah Anda klik Save.</p>
                        </div>
                        <Button type="button" variant="outline" className="w-full" disabled={!canCheck} onClick={() => void check()}>
                            {pending === 'check' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            {pending === 'check' ? 'Memeriksa koneksi...' : 'Check Connection'}
                        </Button>
                    </>
                )}

                {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
                {checked && (
                    <section aria-label="Profil terverifikasi" className="space-y-3">
                        <p className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" />Koneksi berhasil diverifikasi</p>
                        <ConnectionProfileDetails profile={checked.profile} />
                        {checked.sameAccountExists && <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">Akun ini sudah memiliki koneksi dengan API key lain. Anda tetap dapat menyimpan key tambahan.</p>}
                        {expired && <p role="status" className="text-sm text-warning">Verifikasi kedaluwarsa. Klik Check Connection lagi.</p>}
                    </section>
                )}
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Batal</Button>
                    <Button type="submit" disabled={!checked || expired || busy || !name.trim() || name.trim().length > 100}>
                        {pending === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {pending === 'save' ? 'Menyimpan...' : 'Save'}
                    </Button>
                </div>
            </form>
        </ConnectionDialog>
    )
}
