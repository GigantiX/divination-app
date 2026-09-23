"use client"

import { MapPin } from "lucide-react"

import { Label } from "@/components/ui/label"

export interface ReportBatchSession {
    id: string
    name: string
}

interface BatchSessionSelectProps {
    sessions: readonly ReportBatchSession[]
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function BatchSessionSelect({ sessions, value, onChange, disabled = false }: BatchSessionSelectProps) {
    if (sessions.length === 0) return null

    return (
        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
            <Label htmlFor="batch-session" className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                Kota/Sesi *
            </Label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Pilih Kota/Sesi yang menerima leads dan closing pada laporan ini.
            </p>
            <select
                id="batch-session"
                aria-label="Kota/Sesi"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                required
                className="mt-3 h-12 w-full rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
                <option value="">Pilih Kota/Sesi…</option>
                {sessions.map((session) => (
                    <option key={session.id} value={session.id}>{session.name}</option>
                ))}
            </select>
        </section>
    )
}
