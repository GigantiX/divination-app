import type { Metadata } from "next"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = {
    title: "Atur Ulang Kata Sandi | DIVINATION",
    referrer: "no-referrer",
    robots: {
        index: false,
        follow: false,
    },
}

interface ResetPasswordPageProps {
    searchParams: Promise<{ token?: string | string[] }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
    const { token: tokenParam } = await searchParams
    const token = typeof tokenParam === "string" ? tokenParam : ""

    return <ResetPasswordForm token={token} />
}
