"use client"

import * as React from "react"
import Link from "next/link"
import {
    ArrowLeft,
    Loader2,
    Upload,
    Calendar,
    Users,
    UserPlus,
    UserCheck,
    AlertCircle,
    PackageOpen,
} from "lucide-react"

import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type UserProfile } from "@/app/actions/profile"
import { getUploadHistory, type UploadHistoryItem } from "@/app/actions/lead-database"
import { cn } from "@/lib/utils"

export function HistoryClient({ profile }: { profile: UserProfile }) {
    const isAdmin = profile.role === "admin" || profile.role === "developer"
    const [history, setHistory] = React.useState<UploadHistoryItem[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        loadHistory()
    }, [])

    async function loadHistory() {
        setLoading(true)
        const res = await getUploadHistory()
        if (res.data) setHistory(res.data)
        setLoading(false)
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    return (
        <NavigationLayout isAdmin={isAdmin}>
            <div className="flex-1 p-4 pb-24 md:mx-auto md:w-full md:max-w-3xl md:p-6">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/apps/lead-database/upload"
                        className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Kembali ke Upload
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Riwayat Upload
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Daftar kontak yang telah Anda upload sebelumnya.
                    </p>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-xl border border-gray-100">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                            <PackageOpen className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="font-medium text-gray-700">Belum ada riwayat upload</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Upload kontak peserta event untuk melihat riwayatnya di sini.
                        </p>
                        <Link href="/apps/lead-database/upload">
                            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Kontak
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((item) => (
                            <Card
                                key={item.id}
                                className="border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <CardContent className="p-4 sm:p-5">
                                    {/* Top: Date + Event */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate">
                                                {item.event_name}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {item.batch_name}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(item.uploaded_at)}
                                        </span>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1.5 text-gray-700">
                                            <Users className="h-3.5 w-3.5 text-gray-400" />
                                            <span className="font-semibold">{item.total_contacts}</span>
                                            <span className="text-gray-500">total</span>
                                        </div>
                                        <div className="h-4 w-px bg-gray-200" />
                                        <div className="flex items-center gap-1.5 text-emerald-700">
                                            <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
                                            <span className="font-semibold">{item.new_leads}</span>
                                            <span className="text-emerald-600">baru</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-blue-700">
                                            <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                                            <span className="font-semibold">{item.existing_leads}</span>
                                            <span className="text-blue-600">sudah ada</span>
                                        </div>
                                        {item.failed > 0 && (
                                            <div className="flex items-center gap-1.5 text-red-700">
                                                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                                <span className="font-semibold">{item.failed}</span>
                                                <span className="text-red-600">gagal</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress-like bar */}
                                    <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                        {item.new_leads > 0 && (
                                            <div
                                                className="bg-emerald-500 transition-all"
                                                style={{
                                                    width: `${(item.new_leads / item.total_contacts) * 100}%`,
                                                }}
                                            />
                                        )}
                                        {item.existing_leads > 0 && (
                                            <div
                                                className="bg-blue-400 transition-all"
                                                style={{
                                                    width: `${(item.existing_leads / item.total_contacts) * 100}%`,
                                                }}
                                            />
                                        )}
                                        {item.failed > 0 && (
                                            <div
                                                className="bg-red-400 transition-all"
                                                style={{
                                                    width: `${(item.failed / item.total_contacts) * 100}%`,
                                                }}
                                            />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </NavigationLayout>
    )
}
