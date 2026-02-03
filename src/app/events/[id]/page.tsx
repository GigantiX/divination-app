"use client"

import * as React from "react"
import Link from "next/link"
import {
    ChevronLeft,
    MoreVertical,
    Calendar,
    ChevronDown,
    MessageSquare,
    Plus,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

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

// Mock Data
const eventData = {
    id: "1",
    name: "Jakarta Tech Summit",
    batches: [
        { id: "12", name: "Batch 12: Aug 2023 - Present" },
        { id: "11", name: "Batch 11: Jan 2023 - Jul 2023" },
    ],
    stats: {
        spend: "45.000.000",
        leads: "342",
        sales: "12",
        cpl: "131.000",
    },
    advertisers: [
        { id: 1, name: "Budi Santoso", spend: "15.2M", leads: 152, sales: 8, avatar: "/avatars/01.png" },
        { id: 2, name: "Siti Aminah", spend: "12.8M", leads: 98, sales: 4, avatar: "/avatars/02.png" },
        { id: 3, name: "Eko Prasetyo", spend: "8.1M", leads: 92, sales: 0, avatar: "/avatars/03.png" },
    ],
    pics: [
        { id: 1, name: "Andi Susanto", role: "Event Manager", avatar: "/avatars/04.png" },
        { id: 2, name: "Maya Putri", role: "Sales Lead", avatar: "/avatars/05.png" },
        { id: 3, name: "Rizky Fauzan", role: "Technical Support", avatar: "/avatars/06.png" },
    ],
    reports: [
        { id: 1, date: "Oct 24, 2023", spend: "4.5M", leads: 42, sales: 8, reporter: "Budi Santoso" },
        { id: 2, date: "Oct 23, 2023", spend: "3.2M", leads: 35, sales: 5, reporter: "Siti Aminah" },
        { id: 3, date: "Oct 22, 2023", spend: "5.1M", leads: 50, sales: 12, reporter: "Budi Santoso" },
    ],
    chartData: {
        labels: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        datasets: [
            {
                fill: true,
                label: "Leads",
                data: [15, 25, 20, 60, 40, 80, 75],
                borderColor: "#3b82f6", // Blue
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
                data: [5, 12, 8, 25, 15, 30, 28],
                borderColor: "#10b981", // Emerald Green
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
    }
}

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
                drawBorder: false,
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
                drawBorder: false,
            },
            ticks: {
                color: "#9ca3af",
                font: {
                    size: 10
                },
                callback: function (value: string | number) {
                    return value
                }
            }
        },
    },
    interaction: {
        mode: "nearest" as const,
        axis: "x" as const,
        intersect: false,
    },
}

export default function EventDetailPage() {
    const [activeTab, setActiveTab] = React.useState<"overview" | "reports">("overview")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedBatch, setSelectedBatch] = React.useState(eventData.batches[0].id)

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
                    <h1 className="text-lg font-bold text-black">{eventData.name}</h1>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>

                {/* Batch Selector */}
                <div className="px-4 pb-4">
                    <div className="relative flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm transition-colors hover:border-blue-400">
                        <div className="pointer-events-none flex items-center gap-2 text-sm font-medium">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>{eventData.batches.find(b => b.id === selectedBatch)?.name}</span>
                        </div>
                        <ChevronDown className="pointer-events-none h-4 w-4 text-gray-400" />

                        <select
                            className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                        >
                            {eventData.batches.map((batch) => (
                                <option key={batch.id} value={batch.id}>
                                    {batch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

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
            <div className="p-4">
                {activeTab === "overview" ? (
                    <OverviewContent />
                ) : (
                    <ReportsContent />
                )}
            </div>

            {/* FAB */}
            <div className="fixed bottom-6 right-6">
                <Button className="h-14 w-14 rounded-full bg-primary shadow-lg hover:bg-primary-hover">
                    <Plus className="h-6 w-6 text-white" />
                </Button>
            </div>
        </div>
    )
}

function OverviewContent() {
    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard title="SPEND (IDR)" value={`Rp ${eventData.stats.spend}`} />
                <StatCard title="LEADS" value={eventData.stats.leads} />
                <StatCard title="SALES" value={eventData.stats.sales} />
                <StatCard title="CPL (IDR)" value={`Rp ${eventData.stats.cpl}`} />
            </div>

            {/* Chart Section */}
            <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-6">
                    <div className="mb-6 flex items-baseline justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Lead Trend</p>
                            <h3 className="text-xl font-bold">Last 7 Days</h3>
                        </div>
                        <span className="text-sm font-medium text-blue-500">+42 today</span>
                    </div>
                    {/* Chart.js Implementation */}
                    <div className="h-48 w-full">
                        <Line options={chartOptions} data={eventData.chartData} />
                    </div>
                </CardContent>
            </Card>

            {/* Advertiser Section */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-black">Advertiser</h3>
                    <button className="text-sm font-medium text-blue-500">View All</button>
                </div>
                <div className="space-y-3">
                    {eventData.advertisers.map((adv) => (
                        <div key={adv.id} className="rounded-xl border border-blue-50 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-3 mb-3">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">{adv.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className="font-semibold text-gray-900">{adv.name}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-t border-gray-50 pt-3">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Spend</p>
                                    <p className="mt-0.5 text-sm font-bold text-blue-600">{adv.spend}</p>
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
            </div>

            {/* PIC Section */}
            <div>
                <div className="mb-4">
                    <h3 className="font-bold text-black">PIC</h3>
                </div>
                <div className="space-y-3">
                    {eventData.pics.map((pic) => (
                        <div key={pic.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">{pic.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-gray-900">{pic.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ReportsContent() {
    return (
        <div className="space-y-4">
            {eventData.reports.map((report) => (
                <Card key={report.id} className="rounded-2xl border-none shadow-sm">
                    <CardContent className="p-4">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                                <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="font-bold">{report.date}</h4>
                                <p className="text-xs text-gray-500">Daily Report</p>
                            </div>
                        </div>

                        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                            <BadgeBox label="SPEND" value={report.spend} />
                            <BadgeBox label="LEADS" value={report.leads.toString()} />
                            <BadgeBox label="SALES" value={report.sales.toString()} />
                        </div>

                        <div className="flex items-center justify-between border-t pt-3">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px]">{report.reporter.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-gray-500">{report.reporter}</span>
                            </div>
                            <button className="text-sm font-medium text-blue-500">Edit</button>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <div className="pt-4 text-center">
                <p className="text-sm text-gray-400">End of results</p>
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
