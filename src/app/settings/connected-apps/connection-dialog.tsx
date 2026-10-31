'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ConnectionDialog({ title, description, busy, onClose, children }: {
    title: string
    description: string
    busy?: boolean
    onClose: () => void
    children: React.ReactNode
}) {
    const ref = useRef<HTMLDialogElement>(null)
    const id = useId()
    useEffect(() => {
        const dialog = ref.current
        dialog?.showModal()
        return () => dialog?.close()
    }, [])

    return (
        <dialog
            ref={ref}
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
            aria-busy={busy}
            onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
            className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-overlay/60"
        >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                    <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">{title}</h2>
                    <p id={`${id}-description`} className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} disabled={busy} aria-label="Tutup dialog" className="shrink-0">
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="p-5">{children}</div>
        </dialog>
    )
}
