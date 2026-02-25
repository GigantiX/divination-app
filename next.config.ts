import type { NextConfig } from "next"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : ""

const nextConfig: NextConfig = {
    images: {
        remotePatterns: supabaseHostname
            ? [
                {
                    protocol: "https",
                    hostname: supabaseHostname,
                    pathname: "/storage/v1/object/public/**",
                },
            ]
            : [],
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
