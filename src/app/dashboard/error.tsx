"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Dashboard error:", error)
    }, [error])

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-secondary p-6">
            <div className="w-full max-w-sm text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                    Gagal Memuat Dashboard
                </h2>
                <p className="mb-6 text-sm text-gray-500">
                    Tidak dapat memuat data dashboard. Ini mungkin karena masalah koneksi.
                </p>
                <div className="flex flex-col gap-3">
                    <Button onClick={reset} className="w-full h-11">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Coba Lagi
                    </Button>
                    <Link href="/login">
                        <Button variant="outline" className="w-full h-11">
                            Login Ulang
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
