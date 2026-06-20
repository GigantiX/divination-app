"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search,
    Download,
    Upload,
    X,
    Loader2,
    Users,
    Repeat,
    Calendar,
    Phone,
    MessageCircle,
    Copy,
    Check,
    ChevronRight,
    FileText,
    StickyNote,
    ExternalLink,
    Save,
    History,
    Trash2,
    AlertTriangle,
} from "lucide-react"

import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { type UserProfile } from "@/app/actions/profile"
import {
    getLeads,
    getLeadDetail,
    updateLeadNotes,
    deleteLead,
    getLeadStats,
    getAllEventsForFilter,
    getBatchesForEvent,
    type Lead,
    type LeadEvent,
} from "@/app/actions/lead-database"
import { ExportModal } from "./export-modal"

// =====================================================
// HELPERS
// =====================================================

function maskPhone(phone: string): string {
    if (phone.length <= 8) return phone
    const start = phone.slice(0, 4)
    const end = phone.slice(-4)
    return `${start}****${end}`
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

// =====================================================
// TYPES
// =====================================================

interface LeadDatabaseClientProps {
    profile: UserProfile
}

type StatsData = {
    total_leads: number
    multi_event_leads: number
    total_events: number
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function LeadDatabaseClient({ profile }: LeadDatabaseClientProps) {
    // --- State ---
    const [leads, setLeads] = React.useState<Lead[]>([])
    const [totalLeads, setTotalLeads] = React.useState(0)
    const [stats, setStats] = React.useState<StatsData | null>(null)
    const [events, setEvents] = React.useState<{ id: string; name: string }[]>([])
    const [batches, setBatches] = React.useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = React.useState(true)
    const [statsLoading, setStatsLoading] = React.useState(true)

    // Filters
    const [searchQuery, setSearchQuery] = React.useState("")
    const [debouncedSearch, setDebouncedSearch] = React.useState("")
    const [selectedEvent, setSelectedEvent] = React.useState("")
    const [selectedBatch, setSelectedBatch] = React.useState("")

    // Modals
    const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)
    const [detailLoading, setDetailLoading] = React.useState(false)
    const [showExportModal, setShowExportModal] = React.useState(false)

    // Notes state
    const [notes, setNotes] = React.useState("")
    const [notesSaving, setNotesSaving] = React.useState(false)
    const [notesSaved, setNotesSaved] = React.useState(false)

    // Copy state
    const [phoneCopied, setPhoneCopied] = React.useState(false)

    // Delete state
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)

    // --- Debounce search ---
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // --- Load stats ---
    React.useEffect(() => {
        async function loadStats() {
            setStatsLoading(true)
            const result = await getLeadStats()
            if (result.data) {
                setStats(result.data)
            }
            setStatsLoading(false)
        }
        loadStats()
    }, [])

    // --- Load events for filter ---
    React.useEffect(() => {
        async function loadEvents() {
            const result = await getAllEventsForFilter()
            if (result.data) {
                setEvents(result.data)
            }
        }
        loadEvents()
    }, [])

    // --- Load batches when event changes ---
    React.useEffect(() => {
        if (!selectedEvent) {
            setBatches([])
            setSelectedBatch("")
            return
        }
        async function loadBatches() {
            const result = await getBatchesForEvent(selectedEvent)
            if (result.data) {
                setBatches(result.data)
            }
        }
        loadBatches()
        setSelectedBatch("")
    }, [selectedEvent])

    // --- Load leads ---
    React.useEffect(() => {
        async function loadLeads() {
            setLoading(true)
            const result = await getLeads({
                search: debouncedSearch || undefined,
                eventId: selectedEvent || undefined,
                batchId: selectedBatch || undefined,
            })
            if (result.data) {
                setLeads(result.data)
                // For total count, load without filters
                if (!debouncedSearch && !selectedEvent && !selectedBatch) {
                    setTotalLeads(result.data.length)
                }
            }
            setLoading(false)
        }
        loadLeads()
    }, [debouncedSearch, selectedEvent, selectedBatch])

    // --- Load total count once ---
    React.useEffect(() => {
        async function loadTotal() {
            const result = await getLeads({})
            if (result.data) {
                setTotalLeads(result.data.length)
            }
        }
        loadTotal()
    }, [])

    // --- Open lead detail ---
    async function openLeadDetail(leadId: string) {
        setDetailLoading(true)
        setSelectedLead(null)
        const result = await getLeadDetail(leadId)
        if (result.data) {
            setSelectedLead(result.data)
            setNotes(result.data.notes || "")
            setNotesSaved(false)
        }
        setDetailLoading(false)
    }

    // --- Save notes ---
    async function handleSaveNotes() {
        if (!selectedLead) return
        setNotesSaving(true)
        setNotesSaved(false)
        const result = await updateLeadNotes(selectedLead.id, notes)
        if (result.success) {
            setNotesSaved(true)
            setTimeout(() => setNotesSaved(false), 2000)
        }
        setNotesSaving(false)
    }

    // --- Copy phone ---
    function handleCopyPhone(phone: string) {
        navigator.clipboard.writeText(phone)
        setPhoneCopied(true)
        setTimeout(() => setPhoneCopied(false), 2000)
    }

    // --- Close detail modal ---
    function closeDetailModal() {
        setSelectedLead(null)
        setDetailLoading(false)
        setNotes("")
        setNotesSaved(false)
        setShowDeleteConfirm(false)
        setIsDeleting(false)
    }

    // --- Delete lead ---
    async function handleDeleteLead() {
        if (!selectedLead) return
        setIsDeleting(true)
        const result = await deleteLead(selectedLead.id)
        if (result.success) {
            closeDetailModal()
            // Refresh leads list
            const leadsResult = await getLeads({
                search: debouncedSearch || undefined,
                eventId: selectedEvent || undefined,
                batchId: selectedBatch || undefined,
            })
            if (leadsResult.data) {
                setLeads(leadsResult.data)
            }
            // Refresh stats
            const statsResult = await getLeadStats()
            if (statsResult.data) {
                setStats(statsResult.data)
            }
            // Refresh total
            const totalResult = await getLeads({})
            if (totalResult.data) {
                setTotalLeads(totalResult.data.length)
            }
        }
        setIsDeleting(false)
    }

    const isFiltering = debouncedSearch || selectedEvent || selectedBatch

    return (
        <NavigationLayout isAdmin={true}>
            <div className="flex-1 p-4 pb-24 md:mx-auto md:w-full md:max-w-5xl md:p-6">
                {/* =================== HEADER =================== */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Lead Database</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Database lengkap kontak peserta dari semua event.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/apps/lead-database/upload">
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                <Upload className="h-4 w-4" />
                                Upload Kontak
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => setShowExportModal(true)}
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* =================== STATS CARDS =================== */}
                <div className="mb-6 flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {/* Total Leads */}
                    <Card className="min-w-[160px] flex-1 border-none shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                                    <Users className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Total Leads</p>
                                    {statsLoading ? (
                                        <div className="mt-1 h-6 w-12 animate-pulse rounded bg-gray-200" />
                                    ) : (
                                        <p className="text-xl font-bold text-gray-900">
                                            {stats?.total_leads ?? 0}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Multi-Event Leads */}
                    <Card className="min-w-[160px] flex-1 border-none shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                                    <Repeat className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Leads Repeat</p>
                                    {statsLoading ? (
                                        <div className="mt-1 h-6 w-12 animate-pulse rounded bg-gray-200" />
                                    ) : (
                                        <p className="text-xl font-bold text-gray-900">
                                            {stats?.multi_event_leads ?? 0}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Events */}
                    <Card className="min-w-[160px] flex-1 border-none shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Total Events</p>
                                    {statsLoading ? (
                                        <div className="mt-1 h-6 w-12 animate-pulse rounded bg-gray-200" />
                                    ) : (
                                        <p className="text-xl font-bold text-gray-900">
                                            {stats?.total_events ?? 0}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* =================== FILTER BAR =================== */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama atau nomor telepon..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Event Filter */}
                    <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-52"
                    >
                        <option value="">Semua Event</option>
                        {events.map((evt) => (
                            <option key={evt.id} value={evt.id}>
                                {evt.name}
                            </option>
                        ))}
                    </select>

                    {/* Batch Filter */}
                    <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        disabled={!selectedEvent}
                        className={cn(
                            "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-44",
                            !selectedEvent && "cursor-not-allowed opacity-50"
                        )}
                    >
                        <option value="">Semua Batch</option>
                        {batches.map((batch) => (
                            <option key={batch.id} value={batch.id}>
                                {batch.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* =================== RESULTS COUNT =================== */}
                {!loading && (
                    <p className="mb-3 text-xs text-gray-500">
                        Menampilkan {leads.length} dari {totalLeads} lead
                        {isFiltering && " (difilter)"}
                    </p>
                )}

                {/* =================== LEADS LIST =================== */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                        <p className="mt-3 text-sm text-gray-500">Memuat data lead...</p>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold text-gray-900">
                            Belum ada data lead
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {isFiltering
                                ? "Tidak ada lead yang cocok dengan filter Anda."
                                : "Upload kontak peserta untuk mulai membangun database."}
                        </p>
                        {!isFiltering && (
                            <Link href="/apps/lead-database/upload" className="mt-4">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                    <Upload className="h-4 w-4" />
                                    Upload Kontak
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {leads.map((lead) => {
                            const uniqueEvents = Array.from(
                                new Map(
                                    lead.events.map((e) => [e.event_id, e.event_name])
                                ).entries()
                            )
                            const displayEvents = uniqueEvents.slice(0, 3)
                            const overflowCount = uniqueEvents.length - 3

                            return (
                                <button
                                    key={lead.id}
                                    onClick={() => openLeadDetail(lead.id)}
                                    className="w-full text-left"
                                >
                                    <Card className="border-none shadow-sm transition-all hover:shadow-md">
                                        <CardContent className="flex items-center justify-between p-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate font-semibold text-gray-900">
                                                        {lead.primary_name}
                                                    </p>
                                                    {lead.events.length > 1 && (
                                                        <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                                            {new Set(lead.events.map(e => e.event_id)).size} event
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 text-sm text-gray-500">
                                                    {maskPhone(lead.phone)}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {displayEvents.map(([eventId, eventName]) => (
                                                        <span
                                                            key={eventId}
                                                            className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                                                        >
                                                            {eventName.length > 25
                                                                ? eventName.slice(0, 25) + "…"
                                                                : eventName}
                                                        </span>
                                                    ))}
                                                    {overflowCount > 0 && (
                                                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                                                            +{overflowCount} lainnya
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="ml-3 h-5 w-5 shrink-0 text-gray-400" />
                                        </CardContent>
                                    </Card>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* =================== LEAD DETAIL MODAL =================== */}
            {(selectedLead || detailLoading) && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
                    <div
                        className="w-full max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white md:max-w-lg md:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {detailLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                <p className="mt-3 text-sm text-gray-500">Memuat detail...</p>
                            </div>
                        ) : selectedLead ? (
                            <>
                                {/* Modal Header */}
                                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 rounded-t-2xl">
                                    <h2 className="text-lg font-bold text-gray-900">
                                        Detail Lead
                                    </h2>
                                    <button
                                        onClick={closeDetailModal}
                                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                                    >
                                        <X className="h-5 w-5 text-gray-500" />
                                    </button>
                                </div>

                                <div className="px-5 py-4 space-y-5">
                                    {/* Contact Info */}
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {selectedLead.primary_name}
                                        </h3>

                                        {/* Aliases */}
                                        {selectedLead.aliases.length > 1 && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                Juga dikenal sebagai:{" "}
                                                <span className="text-gray-700">
                                                    {selectedLead.aliases
                                                        .filter((a) => a !== selectedLead.primary_name)
                                                        .join(", ")}
                                                </span>
                                            </p>
                                        )}

                                        {/* Phone + Actions */}
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 flex-1">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {selectedLead.phone}
                                                </span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleCopyPhone(selectedLead.phone)}
                                                className="shrink-0"
                                            >
                                                {phoneCopied ? (
                                                    <Check className="h-4 w-4 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <a
                                                href={`https://wa.me/${selectedLead.phone}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="shrink-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                </Button>
                                            </a>
                                        </div>
                                    </div>

                                    {/* Event History */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <History className="h-4 w-4 text-gray-500" />
                                            <h4 className="text-sm font-semibold text-gray-900">
                                                Riwayat Event
                                            </h4>
                                        </div>
                                        <div className="relative space-y-0">
                                            {[...selectedLead.events]
                                                .sort(
                                                    (a, b) =>
                                                        new Date(b.uploaded_at).getTime() -
                                                        new Date(a.uploaded_at).getTime()
                                                )
                                                .map((event, idx, arr) => (
                                                    <div key={`${event.event_id}-${event.batch_id}`} className="relative flex gap-3 pb-4">
                                                        {/* Timeline line */}
                                                        <div className="flex flex-col items-center">
                                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                                                                <div className="h-2 w-2 rounded-full bg-emerald-600" />
                                                            </div>
                                                            {idx < arr.length - 1 && (
                                                                <div className="w-px flex-1 bg-gray-200" />
                                                            )}
                                                        </div>
                                                        {/* Content */}
                                                        <div className="pb-2 min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                                {event.event_name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {event.batch_name}
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                Diupload oleh: {event.uploaded_by_name} •{" "}
                                                                {formatDate(event.uploaded_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <StickyNote className="h-4 w-4 text-gray-500" />
                                            <h4 className="text-sm font-semibold text-gray-900">
                                                Catatan
                                            </h4>
                                        </div>
                                        <Textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Tambahkan catatan tentang lead ini..."
                                            className="min-h-[80px] resize-none text-sm"
                                        />
                                        <div className="mt-2 flex items-center justify-between">
                                            {notesSaved && (
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                                                    <Check className="h-3.5 w-3.5" />
                                                    Catatan tersimpan
                                                </div>
                                            )}
                                            {!notesSaved && <div />}
                                            <Button
                                                onClick={handleSaveNotes}
                                                disabled={notesSaving}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                                size="sm"
                                            >
                                                {notesSaving ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Save className="h-3.5 w-3.5" />
                                                )}
                                                Simpan
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Delete Lead */}
                                    <div className="border-t border-gray-100 pt-4">
                                        {!showDeleteConfirm ? (
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Hapus Lead
                                            </button>
                                        ) : (
                                            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-red-800">
                                                            Hapus lead ini?
                                                        </p>
                                                        <p className="mt-1 text-xs text-red-600">
                                                            Lead <strong>{selectedLead?.primary_name}</strong> dan semua riwayat event-nya akan dihapus permanen.
                                                        </p>
                                                        <div className="mt-3 flex items-center gap-2">
                                                            <Button
                                                                onClick={handleDeleteLead}
                                                                disabled={isDeleting}
                                                                className="bg-red-600 hover:bg-red-700 text-white gap-2"
                                                                size="sm"
                                                            >
                                                                {isDeleting ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                )}
                                                                Ya, Hapus
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setShowDeleteConfirm(false)}
                                                                disabled={isDeleting}
                                                            >
                                                                Batal
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Safe area padding on mobile */}
                                <div className="h-6" />
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            {/* =================== EXPORT MODAL =================== */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                events={events}
                leads={leads}
            />
        </NavigationLayout>
    )
}
