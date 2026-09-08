import Link from "next/link"
import { Calendar as CalendarIcon, CalendarPlus, ExternalLink, LockKeyhole, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { CalendarBatch, CalendarEvent } from "@/app/actions/event-calendar"
import { cn } from "@/lib/utils"
import { getCalendarEventColor } from "./calendar-event-colors"

export type CalendarDayEventGroup = {
    event: CalendarBatch["event"]
    batches: CalendarBatch[]
}

type CalendarDayEventsDialogProps = {
    date: Date
    eventGroups: CalendarDayEventGroup[]
    customEvents: CalendarEvent[]
    onClose: () => void
    onOpenCustomEvent: (event: CalendarEvent) => void
    onAccessDenied: (eventName: string) => void
}

const weekdayLong = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export function CalendarDayEventsDialog({
    date,
    eventGroups,
    customEvents,
    onClose,
    onOpenCustomEvent,
    onAccessDenied,
}: CalendarDayEventsDialogProps) {
    const totalBatches = eventGroups.reduce((total, group) => total + group.batches.length, 0)
    const totalSchedules = eventGroups.length + customEvents.length

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <Card
                role="dialog"
                aria-modal="true"
                aria-labelledby="calendar-day-dialog-title"
                className="max-h-[min(720px,calc(100vh-2rem))] w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 border-b bg-muted/50 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                            <CalendarIcon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                {weekdayLong[date.getDay()]}
                            </p>
                            <h2 id="calendar-day-dialog-title" className="mt-0.5 text-lg font-bold text-foreground sm:text-xl">
                                {date.getDate()} {monthNames[date.getMonth()]} {date.getFullYear()}
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {totalSchedules} jadwal · {totalBatches} batch berjalan
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full"
                        onClick={onClose}
                        aria-label="Tutup daftar event"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </header>

                <div className="max-h-[calc(100vh-13rem)] space-y-5 overflow-y-auto p-4 sm:p-6">
                    {eventGroups.map((group) => {
                        const color = getCalendarEventColor(group.event.id)
                        const canAccess = group.batches.every((batch) => batch.canAccess)

                        return (
                            <section
                                key={group.event.id}
                                className={cn("overflow-hidden rounded-2xl border border-border bg-card border-l-4", color.rail)}
                            >
                                <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className={cn("h-3 w-3 shrink-0 rounded-full ring-4 ring-card", color.dot)} aria-hidden="true" />
                                        <div className="min-w-0">
                                            <h3 className="truncate font-bold text-foreground">{group.event.name}</h3>
                                            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                                                {group.batches.length} batch berjalan pada tanggal ini
                                            </p>
                                        </div>
                                    </div>
                                    {canAccess ? (
                                        <Link href={`/events/${group.event.id}`} onClick={onClose}>
                                            <Button size="sm" className="h-9 w-full gap-1.5 text-xs sm:w-auto">
                                                Lihat Dashboard Event <ExternalLink className="h-3.5 w-3.5" />
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-9 w-full gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                                            onClick={() => onAccessDenied(group.event.name)}
                                        >
                                            <LockKeyhole className="h-3.5 w-3.5" /> Lihat Dashboard Event
                                        </Button>
                                    )}
                                </div>
                                <ul className="space-y-2 p-3" aria-label={`Batch ${group.event.name}`}>
                                    {group.batches.map((batch) => (
                                        <li key={batch.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5">
                                            <span className={cn("h-2 w-2 shrink-0 rounded-full", color.dot)} aria-hidden="true" />
                                            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{batch.name}</span>
                                            {!batch.canAccess && (
                                                <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                                    Terbatas
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )
                    })}

                    {customEvents.length > 0 && (
                        <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card">
                            <div className="flex items-center gap-3 border-b border-primary/15 bg-primary/5 p-4">
                                <CalendarPlus className="h-4 w-4 text-primary" aria-hidden="true" />
                                <div>
                                    <h3 className="font-bold text-foreground">Acara Pribadi</h3>
                                    <p className="text-xs text-muted-foreground">Jadwal yang hanya Anda lihat</p>
                                </div>
                            </div>
                            <div className="space-y-2 p-3">
                                {customEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        type="button"
                                        className="flex w-full items-center justify-between gap-3 rounded-xl bg-primary/10 px-3 py-2.5 text-left transition-colors hover:bg-primary/15"
                                        onClick={() => onOpenCustomEvent(event)}
                                    >
                                        <span className="truncate text-sm font-semibold text-primary">{event.name}</span>
                                        <span className="shrink-0 text-xs font-semibold text-primary">Detail</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {totalSchedules === 0 && (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
                            <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                            <h3 className="mt-3 font-bold text-foreground">Tidak ada jadwal</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Belum ada event atau acara pribadi pada tanggal ini.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}

export function CalendarAccessDeniedDialog({
    eventName,
    onClose,
}: {
    eventName: string
    onClose: () => void
}) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay/55 p-4 backdrop-blur-sm" onClick={onClose}>
            <Card
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="calendar-access-denied-title"
                className="w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                        <LockKeyhole className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 id="calendar-access-denied-title" className="mt-4 text-lg font-bold text-foreground">Akses ditolak</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Anda belum memiliki akses ke dashboard <span className="font-semibold text-foreground">{eventName}</span>.
                    </p>
                </div>
                <div className="border-t bg-muted/60 p-4">
                    <Button type="button" className="w-full" onClick={onClose}>Mengerti</Button>
                </div>
            </Card>
        </div>
    )
}
