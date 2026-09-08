"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
    ChevronLeft,
    MoreVertical,
    Calendar,
    ChevronDown,
    Plus,
    Layers,
    Settings,
    Inbox,
    Loader2,
    Banknote,
    Pencil,
    TrendingUp,
    Wallet,
    Users,
    Target,
    Trash2,
    FileText,
} from "lucide-react"
import dynamic from "next/dynamic"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/ui/sidebar"
import { getEventChartData, getEventDetail, type DateRange, type EventDetailData } from "@/app/actions/event-detail"
import { deleteBatch } from "@/app/actions/batches"
import useSWR from "swr"

const LineChart = dynamic(() => import("./line-chart"), {
    ssr: false,
    loading: () => (
        <div className="h-48 w-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    ),
})

interface EventDetailClientProps {
    data: EventDetailData
}

export function EventDetailClient({ data }: EventDetailClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = React.useState<"overview" | "reports">("overview")
    const [selectedBatch, setSelectedBatch] = React.useState(data.currentBatchId || "")
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const [isBatchLoading, setIsBatchLoading] = React.useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
    const [isDeletingBatch, setIsDeletingBatch] = React.useState(false)
    const menuRef = React.useRef<HTMLDivElement>(null)
    const pendingNavigationRef = React.useRef(false)

    const isAdmin = data.userRole === 'admin' || data.userRole === 'developer'

    const handleExport = (type: string, format: string) => {
        setIsMenuOpen(false)
        const url = `/api/export?type=${type}&format=${format}&eventId=${data.event.id}&batchId=${selectedBatch || 'all'}`
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${type}-${data.event.id}.${format}`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const cacheKey = `/events/${data.event.id}?batch=${data.currentBatchId}&range=${data.range}`
    useSWR(cacheKey, () => getEventDetail(data.event.id, data.currentBatchId ?? undefined, data.range), {
        fallbackData: data,
        revalidateOnFocus: false,
        revalidateOnMount: false,
    })

    // Chart data state
    const [chartData, setChartData] = React.useState<{
        labels: string[]
        leadsData: number[]
        salesData: number[]
        todayLeads: number
    } | null>(null)

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Sync selectedBatch when server data arrives with a new currentBatchId,
    // and clear the loading state when the server responds to a user navigation.
    React.useEffect(() => {
        if (data.currentBatchId && data.currentBatchId !== selectedBatch) {
            setSelectedBatch(data.currentBatchId)
        }
        if (pendingNavigationRef.current) {
            pendingNavigationRef.current = false
            setIsBatchLoading(false)
        }
    }, [data, selectedBatch])

    // Fetch chart data when batch or range changes
    React.useEffect(() => {
        if (!selectedBatch || !data.range) {
            setChartData(null)
            return
        }

        setIsBatchLoading(true)
        getEventChartData(selectedBatch, data.range).then((result) => {
            setChartData(result)
            if (!pendingNavigationRef.current) {
                setIsBatchLoading(false)
            }
        })
    }, [selectedBatch, data.range])

    // Handle batch change
    const handleBatchChange = (newBatchId: string) => {
        pendingNavigationRef.current = true
        setIsBatchLoading(true)
        setSelectedBatch(newBatchId)
        const params = new URLSearchParams(searchParams.toString())
        params.set('batch', newBatchId)
        router.push(`/events/${data.event.id}?${params.toString()}`)
    }

    // Handle time range change
    const handleRangeChange = (newRange: DateRange) => {
        pendingNavigationRef.current = true
        setIsBatchLoading(true)
        const params = new URLSearchParams(searchParams.toString())
        params.set('range', newRange)
        router.push(`/events/${data.event.id}?${params.toString()}`)
    }

    const selectedBatchData = data.batches.find(b => b.id === selectedBatch)
    const batchLabel = selectedBatchData
        ? `${selectedBatchData.name}`
        : "Pilih Batch"

    const handleDeleteBatch = async () => {
        if (!selectedBatch) return
        setIsDeletingBatch(true)
        const result = await deleteBatch(selectedBatch)
        setIsDeletingBatch(false)
        setIsDeleteModalOpen(false)
        if (!result.error) {
            router.push(`/events/${data.event.id}`)
        }
    }

    return (
        <div className="flex min-h-screen bg-background-secondary">
            <Sidebar isAdmin={isAdmin} />
            <div className="flex-1 flex flex-col min-w-0 pb-20 md:pl-64">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold text-foreground">{data.event.name}</h1>
                    <div className="relative" ref={menuRef}>
                        {data.canManageEvent && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                aria-label="More options"
                            >
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        )}

                        {/* Dropdown Menu - Admin/PIC Only */}
                        {isMenuOpen && (
                            <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border bg-card py-1 shadow-lg">
                                <Link
                                    href={`/events/${data.event.id}/batches/new`}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Layers className="h-4 w-4 text-primary" />
                                    Tambah Batch
                                </Link>
                                {selectedBatch && (
                                    <Link
                                        href={`/events/${data.event.id}/batches/${selectedBatch}/edit`}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Pencil className="h-4 w-4 text-warning" />
                                        Edit Batch
                                    </Link>
                                )}
                                {data.canDeleteBatch && selectedBatch && (
                                    <button
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/15 transition-colors"
                                        onClick={() => {
                                            setIsMenuOpen(false)
                                            setIsDeleteModalOpen(true)
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Hapus Batch
                                    </button>
                                )}
                                {(data.userRole === 'admin' || data.userRole === 'developer') && (
                                    <>
                                        <Link
                                            href={`/events/${data.event.id}/edit`}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <Settings className="h-4 w-4 text-muted-foreground" />
                                            Edit Event
                                        </Link>
                                        <div className="h-px bg-muted my-1" />
                                        <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Export</div>
                                        
                                        <div className="px-4 py-2 space-y-1.5 hover:bg-accent transition-colors">
                                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                <Layers className="h-3.5 w-3.5 text-success" />
                                                Performance
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleExport("event-performance", "csv")}
                                                    className="flex-1 py-1 text-center text-xs font-bold bg-success/15 text-success rounded border border-success/30 hover:bg-success/20 transition-colors"
                                                >
                                                    CSV
                                                </button>
                                                <button
                                                    onClick={() => handleExport("event-performance", "xlsx")}
                                                    className="flex-1 py-1 text-center text-xs font-bold bg-success text-success-foreground rounded border border-success/30 hover:bg-success/85 transition-colors"
                                                >
                                                    Excel
                                                </button>
                                            </div>
                                        </div>

                                        <div className="px-4 py-2 space-y-1.5 hover:bg-accent transition-colors">
                                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5 text-primary" />
                                                Daily Log
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleExport("daily-reports", "csv")}
                                                    className="flex-1 py-1 text-center text-xs font-bold bg-primary/15 text-primary rounded border border-primary/30 hover:bg-primary/20 transition-colors"
                                                >
                                                    CSV
                                                </button>
                                                <button
                                                    onClick={() => handleExport("daily-reports", "xlsx")}
                                                    className="flex-1 py-1 text-center text-xs font-bold bg-primary text-primary-foreground rounded border border-primary/30 hover:bg-primary-hover transition-colors"
                                                >
                                                    Excel
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Batch Selector */}
                {data.batches.length > 0 ? (
                    <div className="px-4 pb-4">
                        <div className="relative flex items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/30">
                            <div className="pointer-events-none flex items-center gap-2 text-sm font-medium">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{batchLabel}</span>
                            </div>
                            <ChevronDown className="pointer-events-none h-4 w-4 text-muted-foreground" />

                            <select
                                className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
                                value={selectedBatch}
                                onChange={(e) => handleBatchChange(e.target.value)}
                            >
                                {data.batches.map((batch) => (
                                    <option key={batch.id} value={batch.id}>
                                        {batch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Batch Price */}
                        {selectedBatchData && (
                            <div className="mt-2 flex items-center gap-1.5 px-1">
                                <Banknote className="h-3.5 w-3.5 text-success" />
                                <p className="text-xs text-muted-foreground">
                                    Harga Tiket:{" "}
                                    <span className="font-semibold text-foreground">
                                        {selectedBatchData.price > 0
                                            ? `Rp ${selectedBatchData.price.toLocaleString('id-ID')}`
                                            : "Belum diatur"}
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-4 pb-4">
                        <div className="rounded-lg border-2 border-dashed border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
                            Belum ada batch
                        </div>
                    </div>
                )}


                {/* Tabs */}
                <div className="flex border-b px-4">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={cn(
                            "flex-1 border-b-2 min-h-[44px] py-3 text-sm font-medium transition-colors",
                            activeTab === "overview"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground"
                        )}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("reports")}
                        className={cn(
                            "flex-1 border-b-2 min-h-[44px] py-3 text-sm font-medium transition-colors",
                            activeTab === "reports"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground"
                        )}
                    >
                        Reports
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 relative">
                {isBatchLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background-secondary/80 backdrop-blur-[1px] rounded-lg">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Memuat data...</p>
                        </div>
                    </div>
                )}
                {activeTab === "overview" ? (
                    <div className="space-y-4">
                        {data.batches.length > 0 && selectedBatch && (
                            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                {((
                                    [
                                        { value: 'today' as const, label: 'Hari Ini' },
                                        { value: 'yesterday' as const, label: 'Kemarin' },
                                        { value: '7d' as const, label: '7 Hari' },
                                        { value: '30d' as const, label: '30 Hari' },
                                        { value: 'all' as const, label: 'Semua' },
                                    ]
                                )).map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleRangeChange(option.value)}
                                        disabled={data.range === option.value}
                                        className={cn(
                                            "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                                            data.range === option.value
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:bg-accent"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <OverviewContent
                            data={data}
                            chartData={chartData}
                        />
                    </div>
                ) : (
                    <ReportsContent data={data} />
                )}
            </div>

            {/* FAB - Show only for users who can add reports */}
            {data.canAddReport && selectedBatch && (
                <Link href={`/events/${data.event.id}/reports/new?batch=${selectedBatch}`} className="fixed bottom-6 right-6">
                    <Button className="h-14 w-14 rounded-full bg-primary shadow-lg hover:bg-primary-hover">
                        <Plus className="h-6 w-6 text-primary-foreground" />
                    </Button>
                </Link>
            )}

            {/* Delete Batch Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4 backdrop-blur-[1px]">
                    <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="bg-destructive/15 border-b border-destructive/30 px-6 py-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 shrink-0">
                                <Trash2 className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Hapus Batch?</h3>
                                <p className="text-xs text-destructive font-medium mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-3">
                            <p className="text-sm text-foreground leading-relaxed">
                                Kamu akan menghapus batch{" "}
                                <span className="font-bold text-foreground">"{selectedBatchData?.name}"</span>.
                            </p>
                            <div className="rounded-xl bg-destructive/15 border border-destructive/30 px-4 py-3">
                                <p className="text-xs font-semibold text-destructive leading-relaxed">
                                    ⚠️ Semua laporan harian dalam batch ini akan ikut terhapus secara permanen.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t bg-muted px-6 py-4 flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-11 font-semibold"
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeletingBatch}
                            >
                                Batal
                            </Button>
                            <Button
                                className="flex-1 h-11 bg-destructive hover:bg-destructive-hover font-bold gap-2 text-destructive-foreground"
                                onClick={handleDeleteBatch}
                                disabled={isDeletingBatch}
                            >
                                {isDeletingBatch ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Menghapus...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" />
                                        Ya, Hapus
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    )
}

interface ContentProps {
    data: EventDetailData
    chartData?: {
        labels: string[]
        leadsData: number[]
        salesData: number[]
        todayLeads: number
    } | null
}

function OverviewContent({ data, chartData }: ContentProps) {
    const rangeLabels: Record<DateRange, string> = {
        today: 'Hari Ini',
        yesterday: 'Kemarin',
        '7d': '7 Hari Terakhir',
        '30d': '30 Hari Terakhir',
        all: 'Semua Waktu',
    }
    const chartTitle = rangeLabels[data.range] || 'Hari Ini'

    return (
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column: Main Metrics & Charts */}
            <div className="lg:col-span-8 space-y-6">
                {/* --- Summary Highlights --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    {/* Profit & ROAS Highlight Card */}
                    <div className={`rounded-2xl border p-5 flex flex-col justify-between shadow-sm relative overflow-hidden ${data.stats.profitLoss >= 0 ? "bg-success/15 border-success/30" : "bg-destructive/15 border-destructive/30"}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp className={`w-16 h-16 ${data.stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`} />
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${data.stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`}>
                                PROFIT / LOSS
                            </p>
                            <p className={`mt-1 text-xl font-bold leading-tight break-words md:text-2xl ${data.stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`}>
                                {data.stats.profitLoss >= 0 ? "+" : ""}{formatCurrency(data.stats.profitLoss)}
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.stats.profitLoss >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                                ROAS: {data.stats.roas}x
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.stats.profitLoss >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                                P/L %: {data.stats.totalSpend > 0 ? Math.round((data.stats.profitLoss / data.stats.totalSpend) * 100) : 0}%
                            </div>
                        </div>
                    </div>

                    {/* Financial Overview (Spend & Revenue) */}
                    <div className="grid grid-cols-1 gap-4 lg:gap-6">
                        <div className="rounded-2xl border bg-card p-4 shadow-sm flex items-center gap-4">
                            <div className="rounded-full bg-primary/15 p-3">
                                <Wallet className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">REVENUE</p>
                                <p className="text-base font-bold leading-tight break-words text-foreground sm:text-lg">{formatCurrency(data.stats.revenue)}</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border bg-card p-4 shadow-sm flex items-center gap-4">
                            <div className="rounded-full bg-warning/15 p-3">
                                <Banknote className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">SPEND</p>
                                <p className="text-base font-bold leading-tight break-words text-foreground sm:text-lg">{formatCurrency(data.stats.totalSpend)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Funnel Metrics --- */}
                <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" /> Performa Funnel
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        <StatCard title="LEADS" value={data.stats.totalLeads.toString()} icon={<Users className="h-4 w-4 text-primary" />} />
                        <StatCard title="SALES" value={data.stats.totalSales.toString()} icon={<Target className="h-4 w-4 text-success" />} />
                        <StatCard title="CPR" value={`Rp ${data.stats.cpr.toLocaleString('id-ID')}`} />
                        <StatCard title="CLOSING RATE" value={`${data.stats.closingRate}%`} />
                    </div>
                </div>

                {/* Chart Section */}
                {chartData && (
                    <Card className="rounded-2xl border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="mb-6 flex items-baseline justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Trend Leads & Sales</p>
                                    <h3 className="text-xl font-bold">{chartTitle}</h3>
                                </div>
                                <span className="text-sm font-medium text-primary">
                                    +{chartData.todayLeads || 0} hari ini
                                </span>
                            </div>
                            <div className="h-48 w-full lg:h-64">
                                <LineChart labels={chartData.labels} leadsData={chartData.leadsData} salesData={chartData.salesData} />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Right Column: Sidebar (Advertiser & PIC) */}
            <div className="lg:col-span-4 space-y-6">
                {/* Advertiser Section */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-bold text-foreground">Advertiser</h3>
                        {data.advertisers.length > 5 && (
                            <button className="text-sm font-medium text-primary">Lihat Semua</button>
                        )}
                    </div>
                    {data.advertisers.length > 0 ? (
                        <div className="space-y-4">
                            {data.advertisers.slice(0, 5).map((adv) => (
                                <AdvertiserPerformanceCard key={adv.id} advertiser={adv} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="Belum ada advertiser ditugaskan" />
                    )}
                </div>

                {/* PIC Section */}
                <div>
                    <div className="mb-4">
                        <h3 className="font-bold text-foreground">PIC</h3>
                    </div>
                    {data.pics.length > 0 ? (
                        <div className="space-y-3">
                            {data.pics.map((pic) => (
                                <div key={pic.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                                    <AvatarEmoji emoji={pic.emoji} size="sm" />
                                    <p className="font-medium text-foreground">{pic.name}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="Belum ada PIC ditugaskan" />
                    )}
                </div>
            </div>
        </div>
    )
}

function ReportsContent({ data }: ContentProps) {
    const [expandedAdvId, setExpandedAdvId] = React.useState<string | null>(null)

    // Build unique list of groups by advertisers
    const groups = data.advertisers.map(adv => {
        const reports = data.reports.filter(r => r.reporter.id === adv.id)
        
        // Calculate all-time stats from all reports
        const spend = reports.reduce((sum, r) => sum + r.spend, 0)
        const leads = reports.reduce((sum, r) => sum + r.leads, 0)
        const sales = reports.reduce((sum, r) => sum + r.sales, 0)
        const closingRate = leads > 0 ? Math.round((sales / leads) * 10000) / 100 : 0
        
        // Find current batch price to calculate stats
        const currentBatch = data.batches.find(b => b.id === data.currentBatchId)
        const batchPrice = currentBatch ? currentBatch.price : 0
        const revenue = sales * batchPrice
        const profitLoss = revenue - spend
        const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0

        return {
            id: adv.id,
            name: adv.name,
            emoji: adv.emoji,
            spend,
            leads,
            sales,
            closingRate,
            revenue,
            profitLoss,
            roas,
            reports
        }
    })

    // Find any reports by other users who are not in the advertisers list
    const advertiserIds = new Set(data.advertisers.map(a => a.id))
    const otherReports = data.reports.filter(r => !advertiserIds.has(r.reporter.id))

    if (otherReports.length > 0) {
        const otherGroupsMap = new Map<string, typeof groups[number]>()
        
        // Find current batch price to calculate stats
        const currentBatch = data.batches.find(b => b.id === data.currentBatchId)
        const batchPrice = currentBatch ? currentBatch.price : 0

        otherReports.forEach(report => {
            const reporter = report.reporter
            if (!otherGroupsMap.has(reporter.id)) {
                otherGroupsMap.set(reporter.id, {
                    id: reporter.id,
                    name: `${reporter.name} (Lainnya)`,
                    emoji: reporter.emoji,
                    spend: 0,
                    leads: 0,
                    sales: 0,
                    closingRate: 0,
                    revenue: 0,
                    profitLoss: 0,
                    roas: 0,
                    reports: []
                })
            }
            const g = otherGroupsMap.get(reporter.id)!
            g.reports.push(report)
            g.spend += report.spend
            g.leads += report.leads
            g.sales += report.sales
        })

        otherGroupsMap.forEach(g => {
            g.revenue = g.sales * batchPrice
            g.profitLoss = g.revenue - g.spend
            g.roas = g.spend > 0 ? Math.round((g.revenue / g.spend) * 100) / 100 : 0
            g.closingRate = g.leads > 0 ? Math.round((g.sales / g.leads) * 10000) / 100 : 0
            groups.push(g)
        })
    }

    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-6 rounded-full bg-muted p-6">
                    <Inbox className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                    Belum Ada Laporan
                </h3>
                <p className="text-muted-foreground max-w-xs">
                    {data.canAddReport
                        ? "Tap tombol + untuk menambahkan laporan harian pertama."
                        : "Belum ada laporan untuk batch ini."
                    }
                </p>
            </div>
        )
    }

    const handleToggleExpand = (id: string) => {
        setExpandedAdvId(prev => prev === id ? null : id)
    }

    return (
        <div className="space-y-4">
            {groups.map((adv) => {
                const isExpanded = expandedAdvId === adv.id
                return (
                    <div key={adv.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-200">
                        {/* Header & Stats Summary */}
                        <div
                            onClick={() => handleToggleExpand(adv.id)}
                            className="cursor-pointer hover:bg-accent/30 transition-colors"
                        >
                            {/* Identity Header */}
                            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                                    <AvatarEmoji emoji={adv.emoji} size="sm" className="bg-card shadow-sm" />
                                    <p className="font-semibold text-foreground">{adv.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</p>
                                    <p className="max-w-[160px] break-words text-right text-sm font-bold leading-tight text-foreground sm:text-base">
                                        {formatCurrency(adv.revenue)}
                                    </p>
                                </div>
                            </div>

                            {/* Metrics Body */}
                            <div className="p-4">
                                {/* Profit / ROAS row */}
                                <div className="mb-4 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">P/L:</p>
                                        <p className={`break-words text-xs font-bold leading-tight sm:text-sm ${adv.profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                                            {adv.profitLoss >= 0 ? "+" : ""}{formatCurrency(adv.profitLoss)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 border-l border-border pl-3">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">ROAS:</p>
                                        <p className="text-sm font-bold text-foreground">{adv.roas}x</p>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">P/L %:</p>
                                        <p className={`text-sm font-bold ${adv.profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                                            {adv.spend > 0 ? Math.round((adv.profitLoss / adv.spend) * 100) : 0}%
                                        </p>
                                    </div>
                                </div>

                                {/* Core Metrics Grid */}
                                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:divide-x sm:divide-gray-100">
                                    <div>
                                        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Spend</p>
                                        <p className="mt-1 break-words text-xs font-bold leading-tight text-primary sm:text-sm">{formatCurrency(adv.spend)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leads</p>
                                        <p className="mt-1 text-xs sm:text-sm font-bold text-primary">{adv.leads}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sales</p>
                                        <p className="mt-1 text-xs sm:text-sm font-bold text-success">{adv.sales}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">Closing</p>
                                        <p className="mt-1 text-xs sm:text-sm font-bold text-foreground">{adv.closingRate}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Reports History */}
                        {isExpanded && (
                            <div className="border-t border-border bg-muted/50 p-4 space-y-3">
                                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Riwayat Laporan ({adv.reports.length})
                                </h5>
                                {adv.reports.length > 0 ? (
                                    adv.reports.map((report) => (
                                        <Card key={report.id} className="rounded-xl border border-border bg-card shadow-sm">
                                            <CardContent className="p-4">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                                                            <Calendar className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold">{formatDate(report.date)}</h4>
                                                        </div>
                                                    </div>
                                                    {(data.canManageEvent || report.reporter.id === data.currentUserId) && (
                                                        <Link
                                                            href={`/events/${data.event.id}/reports/${report.id}/edit`}
                                                            className="text-xs font-medium text-primary hover:underline"
                                                        >
                                                            Edit
                                                        </Link>
                                                    )}
                                                </div>

                                                <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                                                    <BadgeBox label="SPEND" value={formatCurrency(report.spend)} />
                                                    <BadgeBox label="LEADS" value={report.leads.toString()} />
                                                    <BadgeBox label="SALES" value={report.sales.toString()} />
                                                </div>

                                                {report.notes && (
                                                    <div className="mt-3 bg-muted rounded-lg p-2.5 text-xs text-muted-foreground border border-border">
                                                        <p className="font-semibold text-muted-foreground mb-0.5">Catatan:</p>
                                                        {report.notes}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-sm text-muted-foreground">
                                        Belum ada laporan harian untuk advertiser ini
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
            <div className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">Akhir dari laporan</p>
            </div>
        </div>
    )
}

function StatCard({ title, value, valueColor, icon }: { title: string; value: string; valueColor?: string; icon?: React.ReactNode }) {
    return (
        <Card className="rounded-2xl border-none shadow-sm h-32 flex flex-col justify-center">
            <CardContent className="p-4">
                <div className="flex items-center gap-2">
                    {icon && <div className="rounded-md bg-muted p-1.5">{icon}</div>}
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">{title}</p>
                </div>
                <p className={`mt-3 text-xl font-bold ${valueColor || ""}`}>{value}</p>
            </CardContent>
        </Card>
    )
}

type AdvertiserPerformance = EventDetailData['advertisers'][number]

function AdvertiserPerformanceCard({ advertiser }: { advertiser: AdvertiserPerformance }) {
    const isProfitable = advertiser.profitLoss >= 0
    const margin = advertiser.spend > 0
        ? Math.round((advertiser.profitLoss / advertiser.spend) * 100)
        : 0

    return (
        <article
            data-testid={`advertiser-card-${advertiser.id}`}
            className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
            <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
                <AvatarEmoji emoji={advertiser.emoji} size="sm" className="shrink-0 bg-primary/10 shadow-none" />
                <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{advertiser.name}</p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Performa Advertiser
                    </p>
                </div>
                <span className={cn(
                    "ml-auto h-2.5 w-2.5 shrink-0 rounded-full",
                    isProfitable ? "bg-success" : "bg-destructive"
                )} aria-label={isProfitable ? "Menguntungkan" : "Belum menguntungkan"} />
            </header>

            <div className="space-y-4 p-4">
                <section aria-label="Investasi dan efisiensi">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Investasi & Efisiensi</p>
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="min-w-0 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Spend</p>
                            <p className="mt-1 break-words text-sm font-bold leading-tight text-primary">
                                {formatCurrency(advertiser.spend)}
                            </p>
                        </div>
                        <div className="min-w-0 rounded-xl border border-border bg-muted/60 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">CPR</p>
                                <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            </div>
                            <p className="mt-1 break-words text-sm font-bold leading-tight text-foreground">
                                {formatCurrency(advertiser.cpr)}
                            </p>
                            <p className="mt-1 text-[10px] leading-none text-muted-foreground">Cost per result</p>
                        </div>
                    </div>
                </section>

                <section aria-label="Funnel konversi">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Funnel</p>
                    <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border/70 bg-muted/35">
                        <AdvertiserMetric label="Leads" value={advertiser.leads.toLocaleString('id-ID')} valueClassName="text-primary" />
                        <AdvertiserMetric label="Sales" value={advertiser.sales.toLocaleString('id-ID')} valueClassName="border-x border-border/70 text-success" />
                        <AdvertiserMetric label="Closing" value={`${advertiser.closingRate}%`} />
                    </div>
                </section>

                <section aria-label="Hasil bisnis" className="border-t border-dashed border-border pt-3">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Hasil Bisnis</p>
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        <AdvertiserMetric label="Revenue" value={formatCurrency(advertiser.revenue)} valueClassName="text-foreground" />
                        <AdvertiserMetric
                            label="Profit / Loss"
                            value={`${isProfitable ? '+' : ''}${formatCurrency(advertiser.profitLoss)}`}
                            valueClassName={isProfitable ? 'text-success' : 'text-destructive'}
                        />
                        <AdvertiserMetric label="ROAS" value={`${advertiser.roas}x`} valueClassName="text-primary" />
                        <AdvertiserMetric
                            label="Margin"
                            value={`${margin}%`}
                            valueClassName={isProfitable ? 'text-success' : 'text-destructive'}
                        />
                    </div>
                </section>
            </div>
        </article>
    )
}

function AdvertiserMetric({
    label,
    value,
    valueClassName,
}: {
    label: string
    value: string
    valueClassName?: string
}) {
    return (
        <div className="min-w-0 px-2.5 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={cn("mt-1 break-words text-xs font-bold leading-tight", valueClassName)}>{value}</p>
        </div>
    )
}

function BadgeBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-[124px] rounded-lg bg-muted p-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
            <p className="text-sm font-semibold leading-tight">{value}</p>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border-2 border-dashed border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
            {message}
        </div>
    )
}

// Helper functions
function formatCurrency(value: number): string {
    return `Rp ${value.toLocaleString('id-ID')}`
}


function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}
