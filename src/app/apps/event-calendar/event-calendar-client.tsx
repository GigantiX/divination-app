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
    ExternalLink
} from "lucide-react"
import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type UserProfile } from "@/app/actions/profile"
import { type CalendarBatch } from "@/app/actions/event-calendar"
import { cn } from "@/lib/utils"
import { AppIcon } from "@/components/ui/app-icon"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"

interface EventCalendarClientProps {
    profile: UserProfile
    initialBatches: CalendarBatch[]
}

export function EventCalendarClient({ profile, initialBatches }: EventCalendarClientProps) {
    const isAdmin = profile.role === "admin" || profile.role === "developer"
    const [currentDate, setCurrentDate] = React.useState(new Date())
    const [viewMode, setViewMode] = React.useState<"month" | "list">("month")
    const [selectedBatch, setSelectedBatch] = React.useState<CalendarBatch | null>(null)
    const [filterStatus, setFilterStatus] = React.useState<string>("all")

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Filter batches by status if a filter is set
    const filteredBatches = React.useMemo(() => {
        if (filterStatus === "all") return initialBatches
        return initialBatches.filter(b => b.event.status === filterStatus)
    }, [initialBatches, filterStatus])

    // Calendar Calculations
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sunday, 1 = Monday
    const prevDaysInMonth = new Date(year, month, 0).getDate()

    const gridDays = React.useMemo(() => {
        const days = []
        // Previous month days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const prevDay = prevDaysInMonth - i
            days.push({
                day: prevDay,
                date: new Date(year, month - 1, prevDay),
                isCurrentMonth: false
            })
        }
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                date: new Date(year, month, i),
                isCurrentMonth: true
            })
        }
        // Next month days to complete 42 cells (6 weeks)
        const totalCells = 42
        const nextMonthDaysCount = totalCells - days.length
        for (let i = 1; i <= nextMonthDaysCount; i++) {
            days.push({
                day: i,
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            })
        }
        return days
    }, [year, month, daysInMonth, firstDayIndex, prevDaysInMonth])

    // Get batches covering a specific day
    const getBatchesForDay = (date: Date) => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        const time = d.getTime()

        return filteredBatches.filter(b => {
            const start = new Date(b.startDate)
            start.setHours(0, 0, 0, 0)
            const startTime = start.getTime()

            if (b.endDate === null) {
                // "for batch without end date it will show start date only"
                return time === startTime
            } else {
                const end = new Date(b.endDate)
                end.setHours(0, 0, 0, 0)
                const endTime = end.getTime()
                return time >= startTime && time <= endTime
            }
        })
    }

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    const handleToday = () => {
        setCurrentDate(new Date())
    }

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "active":
                return "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50"
            case "upcoming":
                return "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50"
            case "completed":
                return "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100/50"
            default:
                return "bg-gray-50 text-gray-700 border-gray-100"
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "active":
                return "Active"
            case "upcoming":
                return "Upcoming"
            case "completed":
                return "Completed"
            default:
                return status
        }
    }

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]

    const weekdayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

    const formatBatchDateRange = (batch: CalendarBatch) => {
        const start = new Date(batch.startDate).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })
        if (!batch.endDate) {
            return `${start} (Ongoing)`
        }
        const end = new Date(batch.endDate).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })
        return `${start} - ${end}`
    }

    const isToday = (date: Date) => {
        const today = new Date()
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
    }

    return (
        <NavigationLayout isAdmin={isAdmin}>
            <div className="flex-1 flex flex-col min-h-screen bg-background-secondary">
                {/* Header */}
                <div className="bg-white border-b px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <AppIcon 
                                icon={CalendarIcon} 
                                iconBg="bg-violet-100" 
                                iconColor="text-violet-600" 
                                size="sm" 
                            />
                            <h1 className="text-xl font-bold text-gray-900">Event Calendar</h1>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Jadwal batch event terintegrasi untuk tim Anda.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg self-start sm:self-center">
                        <button
                            onClick={() => setViewMode("month")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                viewMode === "month" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            <CalendarIcon className="h-3.5 w-3.5" /> Kalender
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            <List className="h-3.5 w-3.5" /> Daftar
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="p-4 md:p-6 space-y-4 max-w-6xl w-full mx-auto flex-1 flex flex-col">
                    
                    {/* Controls & Filter Panel */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border p-4 shadow-sm">
                        
                        {/* Month Navigator (Month View Only) */}
                        {viewMode === "month" ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center border rounded-lg bg-gray-50 shadow-sm">
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none border-r" onClick={prevMonth}>
                                        <ChevronLeft className="h-4.5 w-4.5 text-gray-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none" onClick={nextMonth}>
                                        <ChevronRight className="h-4.5 w-4.5 text-gray-600" />
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
                                <span className="font-bold text-gray-900">Seluruh Jadwal Batch</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500 border">
                                    {filteredBatches.length} Batch
                                </span>
                            </div>
                        )}

                        {/* Status Filters */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                            <span className="text-xs text-gray-400 font-semibold mr-1 shrink-0">FILTER:</span>
                            {["all", "active", "upcoming", "completed"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0",
                                        filterStatus === status 
                                            ? "bg-violet-600 text-white border-violet-600 shadow-sm" 
                                            : "bg-white text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    {status === "all" ? "Semua Status" : getStatusLabel(status)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* View Switcher Output */}
                    {viewMode === "month" ? (
                        <Card className="rounded-2xl border shadow-sm overflow-hidden flex-1">
                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-bold text-gray-500 py-3 uppercase tracking-wider">
                                {weekdayNames.map((name) => (
                                    <div key={name}>{name}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 bg-gray-100/50 gap-[1px] flex-1">
                                {gridDays.map((dayObj, index) => {
                                    const dayBatches = getBatchesForDay(dayObj.date)
                                    const todayState = isToday(dayObj.date)

                                    return (
                                        <div
                                            key={index}
                                            className={cn(
                                                "min-h-[90px] bg-white p-2 flex flex-col gap-1 transition-colors relative group",
                                                !dayObj.isCurrentMonth && "bg-gray-50/70"
                                            )}
                                        >
                                            {/* Date Number Header */}
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={cn(
                                                        "text-xs font-bold flex items-center justify-center h-6 w-6 rounded-full",
                                                        todayState ? "bg-primary text-white shadow-sm" : 
                                                        dayObj.isCurrentMonth ? "text-gray-900" : "text-gray-300"
                                                    )}
                                                >
                                                    {dayObj.day}
                                                </span>
                                                {dayBatches.length > 0 && (
                                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-primary md:hidden">
                                                        {dayBatches.length}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Batch List in Cell (Hidden on extra small screens, dots instead) */}
                                            <div className="hidden md:flex flex-col gap-1 overflow-y-auto max-h-[75px] scrollbar-hide">
                                                {dayBatches.slice(0, 3).map((batch) => (
                                                    <button
                                                        key={batch.id}
                                                        onClick={() => setSelectedBatch(batch)}
                                                        className={cn(
                                                            "w-full text-left truncate text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors",
                                                            getStatusStyles(batch.event.status)
                                                        )}
                                                    >
                                                        {batch.event.name}
                                                    </button>
                                                ))}
                                                {dayBatches.length > 3 && (
                                                    <div className="text-[9px] font-bold text-violet-500 pl-1 text-left">
                                                        +{dayBatches.length - 3} lainnya
                                                    </div>
                                                )}
                                            </div>

                                            {/* Dots for mobile view */}
                                            <div className="flex md:hidden flex-row gap-0.5 mt-auto flex-wrap">
                                                {dayBatches.map((batch) => (
                                                    <div
                                                        key={batch.id}
                                                        className={cn(
                                                            "h-1.5 w-1.5 rounded-full",
                                                            batch.event.status === "active" ? "bg-emerald-500" :
                                                            batch.event.status === "upcoming" ? "bg-blue-500" : "bg-gray-400"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    ) : (
                        /* List View */
                        <div className="space-y-3">
                            {filteredBatches.length > 0 ? (
                                filteredBatches.map((batch) => (
                                    <Card key={batch.id} className="rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div className="flex items-start gap-3.5">
                                                <AppIcon 
                                                    icon={CalendarIcon} 
                                                    iconBg={cn(
                                                        "border shadow-sm",
                                                        batch.event.status === "active" ? "bg-emerald-50 border-emerald-100" :
                                                        batch.event.status === "upcoming" ? "bg-blue-50 border-blue-100" :
                                                        "bg-gray-50 border-gray-100"
                                                    )}
                                                    iconColor={
                                                        batch.event.status === "active" ? "text-emerald-600" :
                                                        batch.event.status === "upcoming" ? "text-blue-600" :
                                                        "text-gray-500"
                                                    }
                                                    size="sm"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-gray-900 text-base">{batch.event.name}</h4>
                                                        <span className={cn(
                                                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                                            getStatusStyles(batch.event.status)
                                                        )}>
                                                            {getStatusLabel(batch.event.status)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-600 mt-0.5">Batch: {batch.name}</p>
                                                    <p className="text-xs text-gray-400 font-medium mt-1">Jadwal: {formatBatchDateRange(batch)}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-9 gap-1.5 text-xs font-semibold"
                                                    onClick={() => setSelectedBatch(batch)}
                                                >
                                                    <Info className="h-3.5 w-3.5" /> Info
                                                </Button>
                                                <Link href={`/events/${batch.event.id}?batch=${batch.id}`}>
                                                    <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                                                        Detail Event <ChevronRightIcon className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center py-16 bg-white rounded-2xl border shadow-sm">
                                    <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h4 className="font-bold text-gray-700">Tidak ada batch event</h4>
                                    <p className="text-sm text-gray-500 mt-1">Silakan sesuaikan filter status atau buat batch baru.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Details Drawer / Modal */}
                {selectedBatch && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
                        <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-2xl animate-in fade-in zoom-in duration-200">
                            {/* Modal Header */}
                            <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <AvatarEmoji emoji="🗓️" size="sm" className="bg-white shadow-sm border" />
                                    <div>
                                        <h3 className="font-bold text-gray-900">Detail Jadwal Batch</h3>
                                        <span className={cn(
                                            "inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mt-0.5",
                                            getStatusStyles(selectedBatch.event.status)
                                        )}>
                                            {getStatusLabel(selectedBatch.event.status)}
                                        </span>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-full"
                                    onClick={() => setSelectedBatch(null)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Modal Body */}
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

                            {/* Modal Footer */}
                            <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-10 text-xs font-semibold shadow-sm"
                                    onClick={() => setSelectedBatch(null)}
                                >
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
            </div>
        </NavigationLayout>
    )
}


