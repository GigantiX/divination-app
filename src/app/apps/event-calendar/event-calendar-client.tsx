"use client"

import * as React from "react"
import Link from "next/link"
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    List,
    Info,
    ChevronRight as ChevronRightIcon,
    X,
    ExternalLink,
    Plus,
    MapPin,
    Clock,
    Trash2,
    CalendarPlus,
} from "lucide-react"
import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type UserProfile } from "@/app/actions/profile"
import { type CalendarBatch, type CalendarEvent, createCalendarEvent, deleteCalendarEvent } from "@/app/actions/event-calendar"
import { cn } from "@/lib/utils"
import { AppIcon } from "@/components/ui/app-icon"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { DatePicker } from "@/components/ui/date-picker"
import type { DateRange } from "react-day-picker"

const strToDate = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
}
const dateToStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

interface EventCalendarClientProps {
    profile: UserProfile
    initialBatches: CalendarBatch[]
    initialCalendarEvents: CalendarEvent[]
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function isUrl(text: string): boolean {
    return /^https?:\/\//i.test(text) || /maps\.google/i.test(text) || /goo\.gl\/maps/i.test(text)
}

function formatTime(time: string | null): string {
    if (!time) return ""
    const [h, m] = time.split(":")
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 === 0 ? 12 : hour % 12
    return `${displayHour}:${m} ${ampm}`
}

const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

const weekdayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

const weekdayLong = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

// ─────────────────────────────────────────────────────────
// Types for the unified day items
// ─────────────────────────────────────────────────────────

type DayItemBatch = { kind: "batch"; data: CalendarBatch }
type DayItemCustom = { kind: "custom"; data: CalendarEvent }
type DayItem = DayItemBatch | DayItemCustom

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────

export function EventCalendarClient({ profile, initialBatches, initialCalendarEvents }: EventCalendarClientProps) {
    const isAdmin = profile.role === "admin" || profile.role === "developer"

    // ── Calendar state ──
    const [currentDate, setCurrentDate] = React.useState(new Date())
    const [viewMode, setViewMode] = React.useState<"month" | "list">("month")
    const [filterStatus, setFilterStatus] = React.useState<string>("all")

    // ── Selection state ──
    const [selectedBatch, setSelectedBatch] = React.useState<CalendarBatch | null>(null)
    const [selectedCalendarEvent, setSelectedCalendarEvent] = React.useState<CalendarEvent | null>(null)
    const [selectedDay, setSelectedDay] = React.useState<Date | null>(null)   // mobile day sheet

    // ── Local custom events (optimistic) ──
    const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>(initialCalendarEvents)

    // ── "Tambah Acara" form sheet ──
    const [showAddSheet, setShowAddSheet] = React.useState(false)
    const [formName, setFormName] = React.useState("")
    const [formStartDate, setFormStartDate] = React.useState("")
    const [formEndDate, setFormEndDate] = React.useState("")
    const [formIsRange, setFormIsRange] = React.useState(false)
    const [formIsFullDay, setFormIsFullDay] = React.useState(true)
    const [formStartTime, setFormStartTime] = React.useState("")
    const [formEndTime, setFormEndTime] = React.useState("")
    const [formHasLocation, setFormHasLocation] = React.useState(false)
    const [formLocation, setFormLocation] = React.useState("")
    const [formError, setFormError] = React.useState<string | null>(null)
    const [formSubmitting, setFormSubmitting] = React.useState(false)

    // ── Delete state ──
    const [deletingId, setDeletingId] = React.useState<string | null>(null)

    // ── Calendar math ──
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayIndex = new Date(year, month, 1).getDay()
    const prevDaysInMonth = new Date(year, month, 0).getDate()

    const filteredBatches = React.useMemo(() => {
        if (filterStatus === "all") return initialBatches
        if (filterStatus === "custom") return []
        return initialBatches.filter(b => b.event.status === filterStatus)
    }, [initialBatches, filterStatus])

    const filteredCustomEvents = React.useMemo(() => {
        if (filterStatus !== "all" && filterStatus !== "custom") return []
        return calendarEvents
    }, [calendarEvents, filterStatus])

    const gridDays = React.useMemo(() => {
        const days = []
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const prevDay = prevDaysInMonth - i
            days.push({ day: prevDay, date: new Date(year, month - 1, prevDay), isCurrentMonth: false })
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, date: new Date(year, month, i), isCurrentMonth: true })
        }
        const nextCount = 42 - days.length
        for (let i = 1; i <= nextCount; i++) {
            days.push({ day: i, date: new Date(year, month + 1, i), isCurrentMonth: false })
        }
        return days
    }, [year, month, daysInMonth, firstDayIndex, prevDaysInMonth])

    // ── Get items for a day (merged) ──
    const getItemsForDay = React.useCallback((date: Date): DayItem[] => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        const time = d.getTime()

        const batchItems: DayItem[] = filteredBatches
            .filter(b => {
                const start = new Date(b.startDate)
                start.setHours(0, 0, 0, 0)
                const startTime = start.getTime()
                if (b.endDate === null) return time === startTime
                const end = new Date(b.endDate)
                end.setHours(0, 0, 0, 0)
                return time >= startTime && time <= end.getTime()
            })
            .map(b => ({ kind: "batch" as const, data: b }))

        const customItems: DayItem[] = filteredCustomEvents
            .filter(e => {
                const start = new Date(e.startDate)
                start.setHours(0, 0, 0, 0)
                if (!e.endDate) return start.getTime() === time
                const end = new Date(e.endDate)
                end.setHours(0, 0, 0, 0)
                return time >= start.getTime() && time <= end.getTime()
            })
            .map(e => ({ kind: "custom" as const, data: e }))

        return [...batchItems, ...customItems]
    }, [filteredBatches, filteredCustomEvents])

    const isToday = (date: Date) => {
        const today = new Date()
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
    }

    // ── Status styles ──
    const getBatchStatusStyles = (status: string) => {
        switch (status) {
            case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60"
            case "upcoming": return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/60"
            case "completed": return "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100/60"
            default: return "bg-gray-50 text-gray-700 border-gray-200"
        }
    }

    const getBatchDotColor = (status: string) => {
        switch (status) {
            case "active": return "bg-emerald-500"
            case "upcoming": return "bg-blue-500"
            case "completed": return "bg-gray-400"
            default: return "bg-gray-400"
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "active": return "Active"
            case "upcoming": return "Upcoming"
            case "completed": return "Completed"
            default: return status
        }
    }

    const formatBatchDateRange = (batch: CalendarBatch) => {
        const start = new Date(batch.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        if (!batch.endDate) return `${start} (Ongoing)`
        const end = new Date(batch.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        return `${start} – ${end}`
    }

    const formatCustomEventDate = (event: CalendarEvent) => {
        const start = new Date(event.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        if (!event.endDate) return start
        const end = new Date(event.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        return `${start} – ${end}`
    }

    // ── Navigation ──
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const handleToday = () => setCurrentDate(new Date())

    // ── Form handlers ──
    const resetForm = () => {
        setFormName("")
        setFormStartDate("")
        setFormEndDate("")
        setFormIsRange(false)
        setFormIsFullDay(true)
        setFormStartTime("")
        setFormEndTime("")
        setFormHasLocation(false)
        setFormLocation("")
        setFormError(null)
    }

    const handleOpenAddSheet = () => {
        resetForm()
        setShowAddSheet(true)
    }

    const handleSubmitEvent = async () => {
        setFormError(null)
        if (!formName.trim()) { setFormError("Nama acara tidak boleh kosong"); return }
        if (!formStartDate) { setFormError("Tanggal mulai wajib diisi"); return }
        if (formIsRange && formEndDate && formEndDate < formStartDate) {
            setFormError("Tanggal selesai tidak boleh sebelum tanggal mulai"); return
        }

        setFormSubmitting(true)

        // Optimistic insert
        const tempId = `temp-${Date.now()}`
        const optimistic: CalendarEvent = {
            id: tempId,
            name: formName.trim(),
            startDate: formStartDate,
            endDate: formIsRange && formEndDate ? formEndDate : null,
            startTime: !formIsFullDay && formStartTime ? formStartTime : null,
            endTime: !formIsFullDay && formEndTime ? formEndTime : null,
            location: formHasLocation && formLocation.trim() ? formLocation.trim() : null,
            createdAt: new Date().toISOString(),
        }
        setCalendarEvents(prev => [...prev, optimistic])
        setShowAddSheet(false)
        resetForm()

        const result = await createCalendarEvent({
            name: optimistic.name,
            startDate: optimistic.startDate,
            endDate: optimistic.endDate,
            startTime: optimistic.startTime,
            endTime: optimistic.endTime,
            location: optimistic.location,
        })

        if (result.error || !result.event) {
            // Revert optimistic
            setCalendarEvents(prev => prev.filter(e => e.id !== tempId))
            setShowAddSheet(true)
            setFormName(optimistic.name)
            setFormStartDate(optimistic.startDate)
            setFormError(result.error || "Gagal menyimpan acara.")
        } else {
            // Replace temp with real
            setCalendarEvents(prev => prev.map(e => e.id === tempId ? result.event! : e))
        }
        setFormSubmitting(false)
    }

    const handleDeleteCalendarEvent = async (id: string) => {
        setDeletingId(id)
        setCalendarEvents(prev => prev.filter(e => e.id !== id))
        setSelectedCalendarEvent(null)
        setSelectedDay(null)

        const result = await deleteCalendarEvent(id)
        if (result.error) {
            // No revert needed — user can re-add. Just show nothing.
            console.error("Delete error:", result.error)
        }
        setDeletingId(null)
    }

    // ── Day cell click (mobile) ──
    const handleDayClick = (date: Date, items: DayItem[]) => {
        if (items.length === 0) return
        setSelectedDay(date)
    }

    // ── All calendar events for the list view ──
    const allListItems: DayItem[] = React.useMemo(() => {
        const batchItems: DayItem[] = filteredBatches.map(b => ({ kind: "batch", data: b }))
        const customItems: DayItem[] = filteredCustomEvents.map(e => ({ kind: "custom", data: e }))
        // Sort by start date
        return [...batchItems, ...customItems].sort((a, b) => {
            const aDate = a.kind === "batch" ? a.data.startDate : a.data.startDate
            const bDate = b.kind === "batch" ? b.data.startDate : b.data.startDate
            return aDate.localeCompare(bDate)
        })
    }, [filteredBatches, filteredCustomEvents])

    return (
        <NavigationLayout isAdmin={isAdmin}>
            <div className="flex-1 flex flex-col min-h-screen bg-background-secondary">
                {/* ── Header ── */}
                <div className="bg-white border-b px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <AppIcon icon={CalendarIcon} iconBg="bg-violet-100" iconColor="text-violet-600" size="sm" />
                            <h1 className="text-xl font-bold text-gray-900">Event Calendar</h1>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Jadwal batch event & acara pribadi Anda.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg self-start sm:self-center">
                        <button
                            onClick={() => setViewMode("month")}
                            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                viewMode === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            <CalendarIcon className="h-3.5 w-3.5" /> Kalender
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            <List className="h-3.5 w-3.5" /> Daftar
                        </button>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="p-4 md:p-6 space-y-4 max-w-6xl w-full mx-auto flex-1 flex flex-col pb-28">

                    {/* Controls & Filter Panel */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border p-4 shadow-sm">

                        {viewMode === "month" ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center border rounded-lg bg-gray-50 shadow-sm">
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none border-r" onClick={prevMonth}>
                                        <ChevronLeft className="h-4 w-4 text-gray-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none" onClick={nextMonth}>
                                        <ChevronRight className="h-4 w-4 text-gray-600" />
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" className="h-9 shadow-sm" onClick={handleToday}>
                                    Hari Ini
                                </Button>
                                <span className="font-bold text-gray-900 min-w-[130px] text-center md:text-left">
                                    {monthNames[month]} {year}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">Seluruh Jadwal</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500 border">
                                    {allListItems.length} item
                                </span>
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                            <span className="text-xs text-gray-400 font-semibold mr-1 shrink-0">FILTER:</span>
                            {[
                                { key: "all", label: "Semua" },
                                { key: "active", label: "Active" },
                                { key: "upcoming", label: "Upcoming" },
                                { key: "completed", label: "Completed" },
                                { key: "custom", label: "Acara Pribadi" },
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterStatus(key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0",
                                        filterStatus === key
                                            ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                                            : "bg-white text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Month View ── */}
                    {viewMode === "month" ? (
                        <Card className="rounded-2xl border shadow-sm overflow-hidden flex-1">
                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-bold text-gray-500 py-3 uppercase tracking-wider">
                                {weekdayNames.map(n => <div key={n}>{n}</div>)}
                            </div>

                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 bg-gray-100/50 gap-[1px]">
                                {gridDays.map((dayObj, index) => {
                                    const items = getItemsForDay(dayObj.date)
                                    const todayState = isToday(dayObj.date)
                                    const hasItems = items.length > 0

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => handleDayClick(dayObj.date, items)}
                                            className={cn(
                                                "min-h-[90px] bg-white p-1.5 flex flex-col gap-0.5 transition-colors relative",
                                                !dayObj.isCurrentMonth && "bg-gray-50/70",
                                                hasItems && "md:cursor-default cursor-pointer active:bg-gray-50"
                                            )}
                                        >
                                            {/* Date number */}
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={cn(
                                                    "text-xs font-bold flex items-center justify-center h-6 w-6 rounded-full",
                                                    todayState ? "bg-violet-600 text-white shadow-sm" :
                                                    dayObj.isCurrentMonth ? "text-gray-900" : "text-gray-300"
                                                )}>
                                                    {dayObj.day}
                                                </span>
                                            </div>

                                            {/* Desktop: text chips */}
                                            <div className="hidden md:flex flex-col gap-0.5 overflow-y-auto max-h-[72px] scrollbar-hide">
                                                {items.slice(0, 3).map((item, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (item.kind === "batch") setSelectedBatch(item.data)
                                                            else setSelectedCalendarEvent(item.data)
                                                        }}
                                                        className={cn(
                                                            "w-full text-left truncate text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors",
                                                            item.kind === "batch"
                                                                ? getBatchStatusStyles(item.data.event.status)
                                                                : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100/60"
                                                        )}
                                                    >
                                                        {item.kind === "batch" ? item.data.event.name : item.data.name}
                                                    </button>
                                                ))}
                                                {items.length > 3 && (
                                                    <div className="text-[9px] font-bold text-violet-500 pl-1">
                                                        +{items.length - 3} lainnya
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mobile: pill strips (Google Calendar-style) */}
                                            <div className="flex md:hidden flex-col gap-0.5 mt-auto">
                                                {items.slice(0, 2).map((item, i) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "h-1 w-full rounded-full",
                                                            item.kind === "batch"
                                                                ? getBatchDotColor(item.data.event.status)
                                                                : "bg-violet-500"
                                                        )}
                                                    />
                                                ))}
                                                {items.length > 2 && (
                                                    <span className="text-[9px] font-bold text-gray-400 leading-none">
                                                        +{items.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    ) : (
                        /* ── List View ── */
                        <div className="space-y-3">
                            {allListItems.length > 0 ? allListItems.map((item, idx) => (
                                item.kind === "batch" ? (
                                    <Card key={`batch-${item.data.id}`} className="rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div className="flex items-start gap-3.5">
                                                <AppIcon
                                                    icon={CalendarIcon}
                                                    iconBg={cn("border shadow-sm",
                                                        item.data.event.status === "active" ? "bg-emerald-50 border-emerald-100" :
                                                        item.data.event.status === "upcoming" ? "bg-blue-50 border-blue-100" :
                                                        "bg-gray-50 border-gray-100"
                                                    )}
                                                    iconColor={
                                                        item.data.event.status === "active" ? "text-emerald-600" :
                                                        item.data.event.status === "upcoming" ? "text-blue-600" :
                                                        "text-gray-500"
                                                    }
                                                    size="sm"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-gray-900 text-base">{item.data.event.name}</h4>
                                                        <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", getBatchStatusStyles(item.data.event.status))}>
                                                            {getStatusLabel(item.data.event.status)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-600 mt-0.5">Batch: {item.data.name}</p>
                                                    <p className="text-xs text-gray-400 font-medium mt-1">Jadwal: {formatBatchDateRange(item.data)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => setSelectedBatch(item.data)}>
                                                    <Info className="h-3.5 w-3.5" /> Info
                                                </Button>
                                                <Link href={`/events/${item.data.event.id}?batch=${item.data.id}`}>
                                                    <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                                                        Detail <ChevronRightIcon className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card key={`custom-${item.data.id}`} className="rounded-2xl border border-violet-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div className="flex items-start gap-3.5">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 border border-violet-200 shadow-sm shrink-0">
                                                    <CalendarPlus className="h-4.5 w-4.5 text-violet-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-gray-900 text-base">{item.data.name}</h4>
                                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                                                            Acara Pribadi
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 font-medium mt-1">
                                                        {formatCustomEventDate(item.data)}
                                                        {item.data.startTime && ` · ${formatTime(item.data.startTime)}${item.data.endTime ? ` – ${formatTime(item.data.endTime)}` : ""}`}
                                                    </p>
                                                    {item.data.location && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <MapPin className="h-3 w-3 text-gray-400" />
                                                            {isUrl(item.data.location) ? (
                                                                <a href={item.data.location} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
                                                                    Lihat Lokasi <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">{item.data.location}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => setSelectedCalendarEvent(item.data)}>
                                                    <Info className="h-3.5 w-3.5" /> Info
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    onClick={() => handleDeleteCalendarEvent(item.data.id)}
                                                    disabled={deletingId === item.data.id}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            )) : (
                                <div className="text-center py-16 bg-white rounded-2xl border shadow-sm">
                                    <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h4 className="font-bold text-gray-700">Tidak ada item</h4>
                                    <p className="text-sm text-gray-500 mt-1">Sesuaikan filter atau tambah acara baru.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                FAB — Tambah Acara
            ═══════════════════════════════════════════════════════════════ */}
            <button
                onClick={handleOpenAddSheet}
                className="fixed bottom-24 right-5 z-40 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-sm px-4 py-3 rounded-full shadow-lg shadow-violet-300 transition-all duration-200"
                aria-label="Tambah Acara"
            >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Tambah Acara</span>
            </button>

            {/* ═══════════════════════════════════════════════════════════════
                MOBILE: Day Bottom Sheet
            ═══════════════════════════════════════════════════════════════ */}
            {selectedDay && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[1px]" onClick={() => setSelectedDay(null)}>
                    <div
                        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Sheet handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="h-1 w-10 rounded-full bg-gray-200" />
                        </div>

                        {/* Sheet header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    {weekdayLong[selectedDay.getDay()]}
                                </p>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {selectedDay.getDate()} {monthNames[selectedDay.getMonth()]} {selectedDay.getFullYear()}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedDay(null)} className="p-2 rounded-full hover:bg-gray-100">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Event list */}
                        <div className="px-4 py-3 space-y-2 max-h-72 overflow-y-auto pb-safe">
                            {getItemsForDay(selectedDay).map((item, i) => (
                                <button
                                    key={i}
                                    className={cn(
                                        "w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border font-semibold text-sm transition-colors",
                                        item.kind === "batch"
                                            ? getBatchStatusStyles(item.data.event.status)
                                            : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100/60"
                                    )}
                                    onClick={() => {
                                        setSelectedDay(null)
                                        if (item.kind === "batch") setSelectedBatch(item.data)
                                        else setSelectedCalendarEvent(item.data)
                                    }}
                                >
                                    <span className="truncate">
                                        {item.kind === "batch" ? item.data.event.name : item.data.name}
                                    </span>
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0",
                                        item.kind === "batch"
                                            ? getBatchStatusStyles(item.data.event.status)
                                            : "bg-violet-100 text-violet-700 border-violet-200"
                                    )}>
                                        {item.kind === "batch" ? getStatusLabel(item.data.event.status) : "Pribadi"}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="h-6" />
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                Batch Detail Modal
            ═══════════════════════════════════════════════════════════════ */}
            {selectedBatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
                    <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-2xl animate-in fade-in zoom-in duration-200">
                        <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <AvatarEmoji emoji="🗓️" size="sm" className="bg-white shadow-sm border" />
                                <div>
                                    <h3 className="font-bold text-gray-900">Detail Jadwal Batch</h3>
                                    <span className={cn("inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mt-0.5", getBatchStatusStyles(selectedBatch.event.status))}>
                                        {getStatusLabel(selectedBatch.event.status)}
                                    </span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full" onClick={() => setSelectedBatch(null)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">EVENT</p>
                                <p className="text-base font-bold text-gray-900 mt-1">{selectedBatch.event.name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">BATCH</p>
                                <p className="text-sm font-semibold text-gray-700 mt-0.5">{selectedBatch.name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">TANGGAL</p>
                                <p className="text-sm font-semibold text-gray-700 mt-0.5">{formatBatchDateRange(selectedBatch)}</p>
                            </div>
                            {selectedBatch.notes && (
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">CATATAN BATCH</p>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selectedBatch.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-10 text-xs font-semibold shadow-sm" onClick={() => setSelectedBatch(null)}>
                                Tutup
                            </Button>
                            <Link href={`/events/${selectedBatch.event.id}?batch=${selectedBatch.id}`} onClick={() => setSelectedBatch(null)}>
                                <Button size="sm" className="h-10 text-xs font-semibold gap-1.5 shadow-sm">
                                    Lihat Dashboard Event <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                Custom Event Detail Modal
            ═══════════════════════════════════════════════════════════════ */}
            {selectedCalendarEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
                    <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-2xl animate-in fade-in zoom-in duration-200">
                        <div className="border-b bg-violet-50 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 border border-violet-200">
                                    <CalendarPlus className="h-4.5 w-4.5 text-violet-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Acara Pribadi</h3>
                                    <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mt-0.5 bg-violet-100 text-violet-700 border-violet-200">
                                        Acara Pribadi
                                    </span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full" onClick={() => setSelectedCalendarEvent(null)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">NAMA ACARA</p>
                                <p className="text-base font-bold text-gray-900 mt-1">{selectedCalendarEvent.name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">TANGGAL</p>
                                <p className="text-sm font-semibold text-gray-700 mt-0.5">{formatCustomEventDate(selectedCalendarEvent)}</p>
                            </div>
                            {(selectedCalendarEvent.startTime) && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">WAKTU</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <p className="text-sm font-semibold text-gray-700">
                                            {formatTime(selectedCalendarEvent.startTime)}
                                            {selectedCalendarEvent.endTime && ` – ${formatTime(selectedCalendarEvent.endTime)}`}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {selectedCalendarEvent.location && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">LOKASI</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        {isUrl(selectedCalendarEvent.location) ? (
                                            <a
                                                href={selectedCalendarEvent.location}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-semibold text-violet-600 hover:underline flex items-center gap-1"
                                            >
                                                Lihat Lokasi di Maps <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        ) : (
                                            <p className="text-sm font-semibold text-gray-700">{selectedCalendarEvent.location}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t bg-gray-50 px-6 py-4 flex justify-between gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 text-xs font-semibold border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 gap-1.5"
                                onClick={() => handleDeleteCalendarEvent(selectedCalendarEvent.id)}
                                disabled={deletingId === selectedCalendarEvent.id}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus
                            </Button>
                            <Button variant="outline" size="sm" className="h-10 text-xs font-semibold shadow-sm" onClick={() => setSelectedCalendarEvent(null)}>
                                Tutup
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                "Tambah Acara" Bottom Sheet
            ═══════════════════════════════════════════════════════════════ */}
            {showAddSheet && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[1px]" onClick={() => setShowAddSheet(false)}>
                    <div
                        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Sheet handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="h-1 w-10 rounded-full bg-gray-200" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                                    <CalendarPlus className="h-4.5 w-4.5 text-violet-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Tambah Acara</h2>
                            </div>
                            <button onClick={() => setShowAddSheet(false)} className="p-2 rounded-full hover:bg-gray-100">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Form body */}
                        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">

                            {/* Error */}
                            {formError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                                    {formError}
                                </div>
                            )}

                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Nama Acara <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="cth. Meeting Tim, Webinar, Ulang Tahun..."
                                    maxLength={100}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
                                />
                            </div>

                            {/* Date Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</label>
                                    {/* Range toggle */}
                                    <button
                                        onClick={() => { setFormIsRange(!formIsRange); if (formIsRange) setFormEndDate("") }}
                                        className="flex items-center gap-2 text-xs font-semibold text-gray-600"
                                    >
                                        <div className={cn(
                                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                                            formIsRange ? "bg-violet-500" : "bg-gray-200"
                                        )}>
                                            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                                                formIsRange ? "translate-x-4" : "translate-x-0.5"
                                            )} />
                                        </div>
                                        Beberapa Hari
                                    </button>
                                </div>
                                <div className={cn("space-y-2", formIsRange && "space-y-3")}>
                                    {!formIsRange ? (
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Tanggal</p>
                                            <DatePicker
                                                mode="single"
                                                selected={formStartDate ? strToDate(formStartDate) : undefined}
                                                onSelect={(date) => {
                                                    setFormStartDate(date ? dateToStr(date) : "")
                                                    setFormEndDate("")
                                                }}
                                                placeholder="Pilih tanggal"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Pilih rentang tanggal</p>
                                            <DatePicker
                                                mode="range"
                                                selected={
                                                    formStartDate
                                                        ? { from: strToDate(formStartDate), to: formEndDate ? strToDate(formEndDate) : undefined }
                                                        : undefined
                                                }
                                                onSelect={(range: DateRange | undefined) => {
                                                    setFormStartDate(range?.from ? dateToStr(range.from) : "")
                                                    setFormEndDate(range?.to ? dateToStr(range.to) : "")
                                                }}
                                                placeholder="Pilih tanggal mulai – akhir"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Time Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu</label>
                                    <button
                                        onClick={() => { setFormIsFullDay(!formIsFullDay); if (!formIsFullDay) { setFormStartTime(""); setFormEndTime("") } }}
                                        className="flex items-center gap-2 text-xs font-semibold text-gray-600"
                                    >
                                        <div className={cn(
                                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                                            formIsFullDay ? "bg-violet-500" : "bg-gray-200"
                                        )}>
                                            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                                                formIsFullDay ? "translate-x-4" : "translate-x-0.5"
                                            )} />
                                        </div>
                                        Sepanjang Hari
                                    </button>
                                </div>
                                {!formIsFullDay && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Mulai</p>
                                            <input
                                                type="time"
                                                value={formStartTime}
                                                onChange={e => setFormStartTime(e.target.value)}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Selesai</p>
                                            <input
                                                type="time"
                                                value={formEndTime}
                                                onChange={e => setFormEndTime(e.target.value)}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Location Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lokasi</label>
                                    <button
                                        onClick={() => { setFormHasLocation(!formHasLocation); if (formHasLocation) setFormLocation("") }}
                                        className="flex items-center gap-2 text-xs font-semibold text-gray-600"
                                    >
                                        <div className={cn(
                                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                                            formHasLocation ? "bg-violet-500" : "bg-gray-200"
                                        )}>
                                            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                                                formHasLocation ? "translate-x-4" : "translate-x-0.5"
                                            )} />
                                        </div>
                                        Tambah Lokasi
                                    </button>
                                </div>
                                {formHasLocation && (
                                    <div>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={formLocation}
                                                onChange={e => setFormLocation(e.target.value)}
                                                placeholder="Nama tempat atau link Google Maps..."
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1.5">Link Google Maps akan otomatis jadi clickable.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 border-t bg-gray-50 flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 rounded-xl font-semibold"
                                onClick={() => setShowAddSheet(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                className="flex-1 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 font-bold gap-2 shadow-sm"
                                onClick={handleSubmitEvent}
                                disabled={formSubmitting}
                            >
                                {formSubmitting ? (
                                    <>
                                        <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Simpan Acara
                                    </>
                                )}
                            </Button>
                        </div>
                        {/* iOS safe area */}
                        <div className="h-6" />
                    </div>
                </div>
            )}
        </NavigationLayout>
    )
}
