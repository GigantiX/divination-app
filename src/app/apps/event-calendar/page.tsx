import { redirect } from "next/navigation"
import { getProfile } from "@/app/actions/profile"
import { getCalendarBatches } from "@/app/actions/event-calendar"
import { EventCalendarClient } from "./event-calendar-client"

export default async function EventCalendarPage() {
    const profile = await getProfile()

    if (!profile) {
        redirect('/login')
    }

    const batches = await getCalendarBatches()

    return <EventCalendarClient profile={profile} initialBatches={batches} />
}
