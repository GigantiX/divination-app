"use client"

import { useId } from "react"
import { MapPin } from "lucide-react"

import { cn } from "@/lib/utils"

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
    const descriptionId = useId()

    if (sessions.length === 0) return null

    return (
        <fieldset
            aria-describedby={descriptionId}
            disabled={disabled}
            className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5"
        >
            <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Kota/Sesi *
            </legend>
            <p id={descriptionId} className="mt-1 text-xs leading-5 text-muted-foreground">
                Pilih Kota/Sesi yang menerima leads dan closing pada laporan ini.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                {sessions.map((session) => (
                    <label
                        key={session.id}
                        className={cn(
                            "flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                            value === session.id
                                ? "border-primary bg-primary text-primary-foreground shadow-md"
                                : "border-border bg-muted text-muted-foreground hover:border-primary/30 hover:text-foreground",
                            disabled && "cursor-not-allowed opacity-50"
                        )}
                    >
                        <input
                            type="radio"
                            name="batch-session"
                            value={session.id}
                            checked={value === session.id}
                            onChange={() => onChange(session.id)}
                            required
                            className="sr-only"
                        />
                        <span
                            aria-hidden="true"
                            className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                value === session.id ? "border-primary-foreground" : "border-muted-foreground"
                            )}
                        >
                            {value === session.id && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                        </span>
                        <span className="break-words">{session.name}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    )
}
