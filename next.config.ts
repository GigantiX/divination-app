import type { NextConfig } from "next"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : ""

const nextConfig: NextConfig = {
    // Next.js development logs include Server Function arguments by default.
    // Connected Apps submits API keys through these functions.
    logging: { serverFunctions: false },
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: "https",
                hostname: "cdn.axelabs.my.id",
            },
            {
                protocol: "https",
                hostname: "*.r2.dev",
            },
            {
                protocol: "https",
                hostname: "*.supabase.co",
            },
            ...(supabaseHostname
                ? [
                    {
                        protocol: "https" as const,
                        hostname: supabaseHostname,
                    },
                ]
                : []),
        ],
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=()" },
                ],
            },
        ]
    },
}

export default nextConfig
