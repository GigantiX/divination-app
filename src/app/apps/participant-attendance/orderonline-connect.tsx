'use client'

import * as React from 'react'
import { CheckCircle2, ExternalLink, KeyRound, Loader2, MonitorUp, RefreshCw, ShieldCheck, X } from 'lucide-react'

import {
    cancelOrderOnlineLogin,
    completeOrderOnlineLogin,
    getOrderOnlineConnectionStatus,
    startOrderOnlineLogin,
    type OrderOnlineConnectionResult,
} from '@/app/actions/orderonline'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConnectionStatus = OrderOnlineConnectionResult['status']

const statusCopy: Record<ConnectionStatus, { detail: string; label: string; tone: string }> = {
    connected: {
        label: 'Tersambung',
        detail: 'Browser privat di VPS siap digunakan untuk mengambil export peserta.',
        tone: 'border-success/30 bg-success/15 text-success',
    },
    login_required: {
        label: 'Perlu login',
        detail: 'Buka browser aman, login, lalu ekspor semua CSV peserta yang diperlukan.',
        tone: 'border-warning/30 bg-warning/15 text-warning',
    },
    not_connected: {
        label: 'Belum tersambung',
        detail: 'Hubungkan akun OrderOnline Anda untuk mengambil CSV peserta.',
        tone: 'border-border bg-muted text-muted-foreground',
    },
    unreachable: {
        label: 'Tidak terjangkau',
        detail: 'VPS belum dapat menjangkau OrderOnline. Coba lagi sebentar.',
        tone: 'border-destructive/30 bg-destructive/10 text-destructive',
    },
}

export function OrderOnlineConnect({ onConnected }: { onConnected?: () => void }) {
    const [status, setStatus] = React.useState<ConnectionStatus>('not_connected')
    const [message, setMessage] = React.useState<string | null>(null)
    const [viewerUrl, setViewerUrl] = React.useState<string | null>(null)
    const [expiresAt, setExpiresAt] = React.useState<string | null>(null)
    const [isPending, startTransition] = React.useTransition()

    React.useEffect(() => {
        let active = true
        void getOrderOnlineConnectionStatus().then((result) => {
            if (!active) return
            setStatus(result.status)
            setMessage(result.error ?? null)
        })
        return () => { active = false }
    }, [])

    const applyResult = (result: OrderOnlineConnectionResult) => {
        setStatus(result.status)
        setMessage(result.error ?? null)
        setExpiresAt(result.expiresAt ?? null)
        setViewerUrl(result.viewerUrl ?? null)
    }

    const startLogin = () => {
        startTransition(async () => applyResult(await startOrderOnlineLogin()))
    }

    const finishSession = () => {
        startTransition(async () => {
            const result = await completeOrderOnlineLogin()
            applyResult(result)
            if (result.status === 'connected') {
                setViewerUrl(null)
                setExpiresAt(null)
                onConnected?.()
            }
        })
    }

    const cancelSession = () => {
        startTransition(async () => {
            applyResult(await cancelOrderOnlineLogin())
            setViewerUrl(null)
            setExpiresAt(null)
        })
    }

    const current = statusCopy[status]
    const expiryLabel = expiresAt
        ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(expiresAt))
        : null

    return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-primary to-transparent" />
        <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                        <MonitorUp className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold tracking-tight text-foreground">OrderOnline browser</p>
                            <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]', current.tone)}>{current.label}</span>
                        </div>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{current.detail}</p>
                    </div>
                </div>
                <Button type="button" variant={status === 'connected' ? 'outline' : 'default'} onClick={startLogin} disabled={isPending} className="h-10 shrink-0 rounded-xl">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : status === 'connected' ? <RefreshCw className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                    {status === 'connected' ? 'Buka lagi' : 'Hubungkan akun'}
                </Button>
            </div>

            <div className="mt-4 grid gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:grid-cols-2">
                <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />Kredensial, cookie, dan token tidak pernah masuk ke Divination.</p>
                <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Selesaikan reCAPTCHA sendiri, lalu ekspor CSV di browser VPS.</p>
            </div>

            {message ? <p role="alert" className="mt-4 rounded-xl border border-warning/30 bg-warning/15 px-3 py-2.5 text-sm text-warning">{message}</p> : null}
        </div>

        {viewerUrl ? <div role="dialog" aria-modal="true" aria-label="Login dan export CSV OrderOnline di browser VPS" className="fixed inset-0 z-50 flex min-h-dvh flex-col bg-slate-950/90 p-3 backdrop-blur-sm sm:p-6">
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
                <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Browser privat VPS</p>
                        <h2 className="mt-1 truncate text-base font-semibold">Login dan export CSV OrderOnline</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                        {expiryLabel ? <span className="hidden sm:inline">Sesi berakhir sekitar {expiryLabel} WIB</span> : null}
                        <Button type="button" variant="outline" onClick={cancelSession} disabled={isPending} className="h-9 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            <X className="h-4 w-4" />Tutup
                        </Button>
                    </div>
                </header>
                <div className="min-h-0 flex-1 bg-black">
                    <iframe title="Browser OrderOnline di VPS" src={viewerUrl} sandbox="allow-forms allow-same-origin allow-scripts" className="h-full min-h-[520px] w-full border-0" />
                </div>
                <footer className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <p className="max-w-2xl text-xs leading-5 text-slate-300">Setelah dashboard terbuka, navigasikan ke data peserta yang diperlukan dan download setiap export sebagai CSV. File CSV tersimpan sementara di VPS, bukan di perangkat Anda.</p>
                    <Button type="button" onClick={finishSession} disabled={isPending} className="h-10 shrink-0 rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}Saya sudah selesai export
                    </Button>
                </footer>
            </div>
        </div> : null}
    </section>
}
