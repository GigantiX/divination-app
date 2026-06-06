import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfile } from "@/app/actions/profile"
import { LeadDatabaseClient } from "./lead-database-client"

export const metadata = {
    title: "Lead Database - Divination",
    description: "Database kontak peserta event",
}

export default async function LeadDatabasePage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const profile = await getProfile()

    if (!profile) {
        redirect("/login")
    }

    // Regular users go to upload page
    if (profile.role !== 'admin' && profile.role !== 'developer') {
        redirect('/apps/lead-database/upload')
    }

    return <LeadDatabaseClient profile={profile} />
}
