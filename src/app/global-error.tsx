"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { ThemeScript } from "@/components/theme-provider"
import "./globals.css"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="id" suppressHydrationWarning>
            <head>
                <ThemeScript />
            </head>
            <body className="m-0 font-sans antialiased">
                <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
                    <div className="max-w-sm text-center">
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
                            <AlertTriangle size={32} className="text-destructive" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold">
                            Kesalahan Sistem
                        </h2>
                        <p className="mb-6 text-sm text-muted-foreground">
                            Terjadi kesalahan serius pada aplikasi. Silakan muat ulang halaman.
                        </p>
                        <button
                            onClick={reset}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <RefreshCw size={16} />
                            Muat Ulang
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
