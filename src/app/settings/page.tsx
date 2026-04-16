import { redirect } from "next/navigation"
import { getFacebookConnectionStatus, getProfile } from "@/app/actions/profile"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
    const profile = await getProfile()
    const facebookConnection = await getFacebookConnectionStatus()

    if (!profile) {
        redirect('/login')
    }

    return <SettingsClient profile={profile} facebookConnection={facebookConnection} />
}
