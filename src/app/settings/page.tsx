import { redirect } from "next/navigation"
import { getProfile } from "@/app/actions/profile"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
    const profile = await getProfile()

    if (!profile) {
        redirect('/login')
    }

    return <SettingsClient profile={profile} />
}
