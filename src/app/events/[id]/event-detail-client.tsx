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
} from "lucide-react"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ScriptableContext
} from "chart.js"
import { Line } from "react-chartjs-2"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { cn } from "@/lib/utils"
import { getEventChartData, type EventDetailData } from "@/app/actions/event-detail"

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            mode: "index" as const,
            intersect: false,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            titleColor: "#000",
            bodyColor: "#000",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
        },
    },
    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                color: "#9ca3af",
                font: {
                    size: 10
                }
            }
        },
        y: {
            display: true,
            min: 0,
            grid: {
                color: "#f3f4f6",
            },
            ticks: {
                color: "#9ca3af",
                font: {
                    size: 10
                },
            }
        },
    },
    interaction: {
        mode: "nearest" as const,
        axis: "x" as const,
        intersect: false,
    },
}

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

    // Fetch chart data when batch changes
    React.useEffect(() => {
        if (selectedBatch) {
            getEventChartData(selectedBatch).then((result) => {
                setChartData(result)
                setIsBatchLoading(false)
            })
        }
    }, [selectedBatch])

    // Handle batch change
    const handleBatchChange = (newBatchId: string) => {
        setIsBatchLoading(true)
        setSelectedBatch(newBatchId)
        const params = new URLSearchParams(searchParams.toString())
        params.set('batch', newBatchId)
        router.push(`/events/${data.event.id}?${params.toString()}`)
    }

    const selectedBatchData = data.batches.find(b => b.id === selectedBatch)
    const batchLabel = selectedBatchData
        ? `${selectedBatchData.name}`
        : "Pilih Batch"

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary pb-20">
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
                                <button
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Settings className="h-4 w-4 text-gray-500" />
                                    Pengaturan Event
                                </button>
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
                            "flex-1 border-b-2 py-3 text-sm font-medium transition-colors",
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
                            "flex-1 border-b-2 py-3 text-sm font-medium transition-colors",
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
                    <OverviewContent data={data} chartData={chartData} />
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
    const chartDataConfig = chartData ? {
        labels: chartData.labels,
        datasets: [
            {
                fill: true,
                label: "Leads",
                data: chartData.leadsData,
                borderColor: "#3b82f6",
                backgroundColor: (context: ScriptableContext<"line">) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, "rgba(59, 130, 246, 0.5)");
                    gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");
                    return gradient;
                },
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: "#3b82f6",
                borderWidth: 2,
            },
            {
                fill: true,
                label: "Sales",
                data: chartData.salesData,
                borderColor: "#10b981",
                backgroundColor: (context: ScriptableContext<"line">) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, "rgba(16, 185, 129, 0.5)");
                    gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");
                    return gradient;
                },
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: "#10b981",
                borderWidth: 2,
            },
        ],
    } : null

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard title="SPEND (IDR)" value={formatCurrency(data.stats.totalSpend)} />
                <StatCard title="LEADS" value={data.stats.totalLeads.toString()} />
                <StatCard title="SALES" value={data.stats.totalSales.toString()} />
                <StatCard title="CPL (IDR)" value={formatCurrency(data.stats.cpl)} />
            </div>

            {/* Chart Section */}
            {chartDataConfig && (
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="mb-6 flex items-baseline justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Trend Lead</p>
                                <h3 className="text-xl font-bold">7 Hari Terakhir</h3>
                            </div>
                            <span className="text-sm font-medium text-blue-500">
                                +{chartData?.todayLeads || 0} hari ini
                            </span>
                        </div>
                        <div className="h-48 w-full">
                            <Line options={chartOptions} data={chartDataConfig} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Advertiser Section */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-black">Advertiser</h3>
                    {data.advertisers.length > 3 && (
                        <button className="text-sm font-medium text-blue-500">Lihat Semua</button>
                    )}
                </div>
                {data.advertisers.length > 0 ? (
                    <div className="space-y-3">
                        {data.advertisers.slice(0, 5).map((adv) => (
                            <div key={adv.id} className="rounded-xl border border-blue-50 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center gap-3 mb-3">
                                    <AvatarEmoji emoji={adv.emoji} size="md" className="border-2 border-white shadow-sm" />
                                    <p className="font-semibold text-gray-900">{adv.name}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-3">
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Spend</p>
                                        <p className="mt-0.5 text-sm font-bold text-blue-600">{formatCompact(adv.spend)}</p>
                                    </div>
                                    <div className="border-l border-gray-100 pl-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Leads</p>
                                        <p className="mt-0.5 text-sm font-bold text-violet-600">{adv.leads}</p>
                                    </div>
                                    <div className="border-l border-gray-100 pl-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sales</p>
                                        <p className="mt-0.5 text-sm font-bold text-emerald-500">{adv.sales}</p>
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

function StatCard({ title, value }: { title: string; value: string }) {
    return (
        <Card className="rounded-2xl border-none shadow-sm h-32 flex flex-col justify-center">
            <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{title}</p>
                <p className="mt-2 text-xl font-bold">{value}</p>
            </CardContent>
        </Card>
    )
}

function BadgeBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-[80px] rounded-lg bg-gray-50 p-2">
            <p className="text-[10px] font-medium text-gray-500 uppercase">{label}</p>
            <p className="font-semibold">{value}</p>
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
    if (value >= 1000000000) {
        return `Rp ${(value / 1000000000).toFixed(1)}B`
    }
    if (value >= 1000000) {
        return `Rp ${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
        return `Rp ${(value / 1000).toFixed(0)}K`
    }
    return `Rp ${value.toLocaleString('id-ID')}`
}

function formatCompact(value: number): string {
    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)}B`
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}
