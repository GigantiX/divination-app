import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfile } from "@/app/actions/profile"
import { UploadClient } from "../upload-client"

export const metadata = {
    title: "Upload Kontak - Divination",
    description: "Upload kontak peserta event",
}

export default async function UploadPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const profile = await getProfile()

    if (!profile) {
        redirect("/login")
    }

    return <UploadClient profile={profile} />
}
