import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfile } from "@/app/actions/profile"
import { HistoryClient } from "./history-client"

export const metadata = {
    title: "Riwayat Upload - Divination",
    description: "Riwayat upload kontak peserta event",
}

export default async function HistoryPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const profile = await getProfile()

    if (!profile) {
        redirect("/login")
    }

    return <HistoryClient profile={profile} />
}
