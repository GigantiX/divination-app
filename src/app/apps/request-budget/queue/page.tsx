import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfile } from "@/app/actions/profile"
import { QueueClient } from "./queue-client"

export const metadata = {
    title: "Queue Request Budget - Divination",
    description: "Antrian persetujuan budget iklan",
}

export default async function QueuePage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const profile = await getProfile()

    if (!profile || (profile.role !== "admin" && profile.role !== "developer")) {
        redirect("/apps/request-budget")
    }

    return <QueueClient profile={profile} />
}
