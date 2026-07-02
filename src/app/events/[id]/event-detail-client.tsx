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
} from "lucide-react"
import dynamic from "next/dynamic"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/ui/sidebar"
import { getEventChartData, getEventDetail, type DateRange, type EventDetailData } from "@/app/actions/event-detail"
import useSWR from "swr"

const LineChart = dynamic(() => import("./line-chart"), {
    ssr: false,
    loading: () => (
        <div className="h-48 w-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
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
    const menuRef = React.useRef<HTMLDivElement>(null)
    const pendingNavigationRef = React.useRef(false)

    const isAdmin = data.userRole === 'admin' || data.userRole === 'developer'

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
    }, [data])

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

    return (
        <div className="flex min-h-screen bg-background-secondary">
            <Sidebar isAdmin={isAdmin} />
            <div className="flex-1 flex flex-col min-w-0 pb-20 md:pl-64">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-bold text-black">{data.event.name}</h1>
                    <div className="relative" ref={menuRef}>
                        {data.canManageEvent && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                            >
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        )}

                        {/* Dropdown Menu - Admin/PIC Only */}
                        {isMenuOpen && (
                            <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border bg-white py-1 shadow-lg">
                                <Link
                                    href={`/events/${data.event.id}/batches/new`}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Layers className="h-4 w-4 text-blue-500" />
                                    Tambah Batch
                                </Link>
                                {selectedBatch && (
                                    <Link
                                        href={`/events/${data.event.id}/batches/${selectedBatch}/edit`}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Pencil className="h-4 w-4 text-amber-500" />
                                        Edit Batch
                                    </Link>
                                )}
                                {(data.userRole === 'admin' || data.userRole === 'developer') && (
                                    <Link
                                        href={`/events/${data.event.id}/edit`}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Settings className="h-4 w-4 text-gray-500" />
                                        Edit Event
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Batch Selector */}
                {data.batches.length > 0 ? (
                    <div className="px-4 pb-4">
                        <div className="relative flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm transition-colors hover:border-blue-400">
                            <div className="pointer-events-none flex items-center gap-2 text-sm font-medium">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>{batchLabel}</span>
                            </div>
                            <ChevronDown className="pointer-events-none h-4 w-4 text-gray-400" />

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
                                <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                                <p className="text-xs text-gray-500">
                                    Harga Tiket:{" "}
                                    <span className="font-semibold text-gray-700">
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
                        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
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
                                : "border-transparent text-gray-500"
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
                                : "border-transparent text-gray-500"
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
                            <p className="text-sm text-gray-500">Memuat data...</p>
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
                                                ? "bg-primary text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                        <Plus className="h-6 w-6 text-white" />
                    </Button>
                </Link>
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
                    <div className={`rounded-2xl border p-5 flex flex-col justify-between shadow-sm relative overflow-hidden ${data.stats.profitLoss >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp className={`w-16 h-16 ${data.stats.profitLoss >= 0 ? "text-emerald-500" : "text-red-500"}`} />
                        </div>
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${data.stats.profitLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                PROFIT / LOSS
                            </p>
                            <p className={`mt-1 text-xl font-bold leading-tight break-words md:text-2xl ${data.stats.profitLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                {data.stats.profitLoss >= 0 ? "+" : ""}{formatCurrency(data.stats.profitLoss)}
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.stats.profitLoss >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                ROAS: {data.stats.roas}x
                            </div>
                        </div>
                    </div>

                    {/* Financial Overview (Spend & Revenue) */}
                    <div className="grid grid-cols-1 gap-4 lg:gap-6">
                        <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-4">
                            <div className="rounded-full bg-blue-50 p-3">
                                <Wallet className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">REVENUE</p>
                                <p className="text-base font-bold leading-tight break-words text-gray-800 sm:text-lg">{formatCurrency(data.stats.revenue)}</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-4">
                            <div className="rounded-full bg-orange-50 p-3">
                                <Banknote className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">SPEND</p>
                                <p className="text-base font-bold leading-tight break-words text-gray-800 sm:text-lg">{formatCurrency(data.stats.totalSpend)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Funnel Metrics --- */}
                <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <Target className="h-4 w-4 text-gray-400" /> Performa Funnel
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        <StatCard title="LEADS" value={data.stats.totalLeads.toString()} icon={<Users className="h-4 w-4 text-blue-500" />} />
                        <StatCard title="SALES" value={data.stats.totalSales.toString()} icon={<Target className="h-4 w-4 text-emerald-500" />} />
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
                                    <p className="text-sm font-medium text-gray-500">Trend Leads & Sales</p>
                                    <h3 className="text-xl font-bold">{chartTitle}</h3>
                                </div>
                                <span className="text-sm font-medium text-blue-500">
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
                        <h3 className="font-bold text-black">Advertiser</h3>
                        {data.advertisers.length > 5 && (
                            <button className="text-sm font-medium text-blue-500">Lihat Semua</button>
                        )}
                    </div>
                    {data.advertisers.length > 0 ? (
                        <div className="space-y-4">
                            {data.advertisers.slice(0, 5).map((adv) => (
                                <div key={adv.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                                    {/* Header / Identity */}
                                    <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <AvatarEmoji emoji={adv.emoji} size="sm" className="bg-white shadow-sm" />
                                            <p className="font-semibold text-gray-900">{adv.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</p>
                                            <p className="max-w-[160px] break-words text-right text-sm font-bold leading-tight text-gray-900 sm:text-base">
                                                {formatCompact(adv.revenue)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Metrics Body */}
                                    <div className="p-4">
                                        {/* Profit / ROAS row */}
                                        <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <p className="text-xs font-semibold text-gray-500 uppercase">P/L:</p>
                                                <p className={`break-words text-xs font-bold leading-tight sm:text-sm ${adv.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {adv.profitLoss >= 0 ? "+" : ""}{formatCompact(adv.profitLoss)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                                                <p className="text-xs font-semibold text-gray-500 uppercase">ROAS:</p>
                                                <p className="text-sm font-bold text-gray-900">{adv.roas}x</p>
                                            </div>
                                        </div>

                                        {/* Core Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 sm:divide-x sm:divide-gray-100">
                                            <div>
                                                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">Spend</p>
                                                <p className="mt-1 break-words text-xs font-bold leading-tight text-blue-600 sm:text-sm">{formatCompact(adv.spend)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">Leads</p>
                                                <p className="mt-1 text-xs sm:text-sm font-bold text-violet-600">{adv.leads}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">Sales</p>
                                                <p className="mt-1 text-xs sm:text-sm font-bold text-emerald-500">{adv.sales}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">Closing</p>
                                                <p className="mt-1 text-xs sm:text-sm font-bold text-gray-700">{adv.closingRate}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="Belum ada advertiser ditugaskan" />
                    )}
                </div>

                {/* PIC Section */}
                <div>
                    <div className="mb-4">
                        <h3 className="font-bold text-black">PIC</h3>
                    </div>
                    {data.pics.length > 0 ? (
                        <div className="space-y-3">
                            {data.pics.map((pic) => (
                                <div key={pic.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                    <AvatarEmoji emoji={pic.emoji} size="sm" />
                                    <p className="font-medium text-gray-900">{pic.name}</p>
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
    if (data.reports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-6 rounded-full bg-gray-100 p-6">
                    <Inbox className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Belum Ada Laporan
                </h3>
                <p className="text-gray-500 max-w-xs">
                    {data.canAddReport
                        ? "Tap tombol + untuk menambahkan laporan harian pertama."
                        : "Belum ada laporan untuk batch ini."
                    }
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {data.reports.map((report) => (
                <Card key={report.id} className="rounded-2xl border-none shadow-sm">
                    <CardContent className="p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                                <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="font-bold">{formatDate(report.date)}</h4>
                                <p className="text-xs text-gray-500">Laporan Harian</p>
                            </div>
                        </div>

                        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                            <BadgeBox label="SPEND" value={formatCompact(report.spend)} />
                            <BadgeBox label="LEADS" value={report.leads.toString()} />
                            <BadgeBox label="SALES" value={report.sales.toString()} />
                        </div>

                        <div className="flex items-center justify-between border-t pt-3">
                            <div className="flex items-center gap-2">
                                <AvatarEmoji emoji={report.reporter.emoji} size="sm" />
                                <span className="text-xs text-gray-500">{report.reporter.name}</span>
                            </div>
                            {(data.canManageEvent || report.reporter.id === data.currentUserId) && (
                                <Link
                                    href={`/events/${data.event.id}/reports/${report.id}/edit`}
                                    className="text-sm font-medium text-blue-500"
                                >
                                    Edit
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
            <div className="pt-4 text-center">
                <p className="text-sm text-gray-400">Akhir dari laporan</p>
            </div>
        </div>
    )
}

function StatCard({ title, value, valueColor, icon }: { title: string; value: string; valueColor?: string; icon?: React.ReactNode }) {
    return (
        <Card className="rounded-2xl border-none shadow-sm h-32 flex flex-col justify-center">
            <CardContent className="p-4">
                <div className="flex items-center gap-2">
                    {icon && <div className="rounded-md bg-gray-50 p-1.5">{icon}</div>}
                    <p className="text-xs font-bold uppercase text-gray-400 tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">{title}</p>
                </div>
                <p className={`mt-3 text-xl font-bold ${valueColor || ""}`}>{value}</p>
            </CardContent>
        </Card>
    )
}

function BadgeBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-[124px] rounded-lg bg-gray-50 p-2">
            <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
            <p className="text-sm font-semibold leading-tight">{value}</p>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            {message}
        </div>
    )
}

// Helper functions
function formatCurrency(value: number): string {
    return `Rp ${value.toLocaleString('id-ID')}`
}

function formatCompact(value: number): string {
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
