import { redirect } from "next/navigation"
import { getProfile } from "@/app/actions/profile"
import { EditProfileClient } from "./edit-profile-client"

export default async function EditProfilePage() {
    const profile = await getProfile()

    if (!profile) {
        redirect('/login')
    }

    return <EditProfileClient profile={profile} />
}
