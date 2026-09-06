"use client"

import * as React from "react"
import { Download, X, FileSpreadsheet } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    getBatchesForEvent,
    type Lead,
} from "@/app/actions/lead-database"

// =====================================================
// TYPES
// =====================================================

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
    events: { id: string; name: string }[]
    leads: Lead[]
}

type ExportScope = "all" | "event" | "batch"

// =====================================================
// COMPONENT
// =====================================================

export function ExportModal({ isOpen, onClose, events, leads }: ExportModalProps) {
    const [scope, setScope] = React.useState<ExportScope>("all")
    const [selectedEvent, setSelectedEvent] = React.useState("")
    const [selectedBatch, setSelectedBatch] = React.useState("")
    const [batches, setBatches] = React.useState<{ id: string; name: string }[]>([])
    const [batchesLoading, setBatchesLoading] = React.useState(false)

    // Load batches when event changes
    React.useEffect(() => {
        if (!selectedEvent) {
            setBatches([])
            setSelectedBatch("")
            return
        }
        async function loadBatches() {
            setBatchesLoading(true)
            const result = await getBatchesForEvent(selectedEvent)
            if (result.data) {
                setBatches(result.data)
            }
            setBatchesLoading(false)
        }
        loadBatches()
        setSelectedBatch("")
    }, [selectedEvent])

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (!isOpen) {
            setScope("all")
            setSelectedEvent("")
            setSelectedBatch("")
            setBatches([])
        }
    }, [isOpen])

    // Filter leads based on scope
    const filteredLeads = React.useMemo(() => {
        if (scope === "all") return leads

        if (scope === "event" && selectedEvent) {
            return leads.filter((lead) =>
                lead.events.some((e) => e.event_id === selectedEvent)
            )
        }

        if (scope === "batch" && selectedBatch) {
            return leads.filter((lead) =>
                lead.events.some((e) => e.batch_id === selectedBatch)
            )
        }

        return leads
    }, [leads, scope, selectedEvent, selectedBatch])

    // Generate and download CSV
    function handleExport() {
        const rows: string[][] = [["Nama", "Nomor WhatsApp", "Event", "Batch"]]

        filteredLeads.forEach((lead) => {
            // Determine which events to include based on scope
            let eventsToInclude = lead.events

            if (scope === "event" && selectedEvent) {
                eventsToInclude = lead.events.filter(
                    (e) => e.event_id === selectedEvent
                )
            } else if (scope === "batch" && selectedBatch) {
                eventsToInclude = lead.events.filter(
                    (e) => e.batch_id === selectedBatch
                )
            }

            if (eventsToInclude.length === 0) {
                // Fallback: export lead with no event info
                rows.push([
                    lead.primary_name,
                    lead.phone,
                    "",
                    "",
                ])
            } else {
                eventsToInclude.forEach((evt) => {
                    rows.push([
                        lead.primary_name,
                        lead.phone,
                        evt.event_name,
                        evt.batch_name,
                    ])
                })
            }
        })

        // Build CSV string
        const csvContent = rows
            .map((row) =>
                row
                    .map((cell) => {
                        // Escape double quotes and wrap in quotes if needed
                        if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
                            return `"${cell.replace(/"/g, '""')}"`
                        }
                        return cell
                    })
                    .join(",")
            )
            .join("\n")

        // Create and trigger download
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute(
            "download",
            `lead-database-export-${new Date().toISOString().slice(0, 10)}.csv`
        )
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        onClose()
    }

    if (!isOpen) return null

    const scopeOptions: { value: ExportScope; label: string }[] = [
        { value: "all", label: "Semua Lead" },
        { value: "event", label: "Per Event" },
        { value: "batch", label: "Per Batch" },
    ]

    const canExport =
        scope === "all" ||
        (scope === "event" && selectedEvent) ||
        (scope === "batch" && selectedBatch)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
            <Card className="w-full max-w-md border-none shadow-xl">
                <CardContent className="p-0">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-success" />
                            <h2 className="text-lg font-bold text-foreground">
                                Export Lead Database
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4 space-y-4">
                        {/* Scope selector */}
                        <div>
                            <p className="mb-2 text-sm font-medium text-foreground">
                                Pilih data yang akan di-export
                            </p>
                            <div className="flex gap-2">
                                {scopeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setScope(option.value)
                                            if (option.value === "all") {
                                                setSelectedEvent("")
                                                setSelectedBatch("")
                                            }
                                        }}
                                        className={cn(
                                            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                                            scope === option.value
                                                ? "border-success/30 bg-success/15 text-success"
                                                : "border-border bg-card text-muted-foreground hover:bg-accent"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Event dropdown (for "Per Event" and "Per Batch") */}
                        {(scope === "event" || scope === "batch") && (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-foreground">
                                    Pilih Event
                                </label>
                                <select
                                    value={selectedEvent}
                                    onChange={(e) => setSelectedEvent(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-success/30 focus:outline-none focus:ring-2 focus:ring-success"
                                >
                                    <option value="">-- Pilih Event --</option>
                                    {events.map((evt) => (
                                        <option key={evt.id} value={evt.id}>
                                            {evt.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Batch dropdown (for "Per Batch" only) */}
                        {scope === "batch" && selectedEvent && (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-foreground">
                                    Pilih Batch
                                </label>
                                <select
                                    value={selectedBatch}
                                    onChange={(e) => setSelectedBatch(e.target.value)}
                                    disabled={batchesLoading}
                                    className={cn(
                                        "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-success/30 focus:outline-none focus:ring-2 focus:ring-success",
                                        batchesLoading && "opacity-50"
                                    )}
                                >
                                    <option value="">
                                        {batchesLoading ? "Memuat batch..." : "-- Pilih Batch --"}
                                    </option>
                                    {batches.map((batch) => (
                                        <option key={batch.id} value={batch.id}>
                                            {batch.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Preview count */}
                        <div className="rounded-lg bg-muted px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                    {filteredLeads.length}
                                </span>{" "}
                                kontak akan di-export
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 border-t border-border px-5 py-4">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={onClose}
                        >
                            Batal
                        </Button>
                        <Button
                            className="flex-1 bg-success hover:bg-success/85 text-success-foreground gap-2"
                            onClick={handleExport}
                            disabled={!canExport || filteredLeads.length === 0}
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
