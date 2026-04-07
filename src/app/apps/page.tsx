import { redirect } from "next/navigation"
import { getProfile } from "@/app/actions/profile"
import { AppsClient } from "./apps-client"

export default async function AppsPage() {
    const profile = await getProfile()

    if (!profile) {
        redirect('/login')
    }

    return <AppsClient profile={profile} />
}
