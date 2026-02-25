"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="id">
            <body style={{ margin: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>
                <div
                    style={{
                        display: "flex",
                        minHeight: "100vh",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#f8fafc",
                        padding: "24px",
                    }}
                >
                    <div style={{ maxWidth: "384px", textAlign: "center" }}>
                        <div
                            style={{
                                margin: "0 auto 24px",
                                width: "64px",
                                height: "64px",
                                borderRadius: "50%",
                                backgroundColor: "#fef2f2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <AlertTriangle size={32} color="#ef4444" />
                        </div>
                        <h2
                            style={{
                                fontSize: "20px",
                                fontWeight: 700,
                                color: "#111827",
                                marginBottom: "8px",
                            }}
                        >
                            Kesalahan Sistem
                        </h2>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "#6b7280",
                                marginBottom: "24px",
                            }}
                        >
                            Terjadi kesalahan serius pada aplikasi. Silakan muat ulang halaman.
                        </p>
                        <button
                            onClick={reset}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                width: "100%",
                                height: "44px",
                                backgroundColor: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
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
