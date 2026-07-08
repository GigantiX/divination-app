import { redirect } from "next/navigation"
import { getProfile } from "@/app/actions/profile"
import { getCalendarBatches, getCalendarEvents } from "@/app/actions/event-calendar"
import { EventCalendarClient } from "./event-calendar-client"

export default async function EventCalendarPage() {
    const profile = await getProfile()

    if (!profile) {
        redirect('/login')
    }

    const [batches, calendarEvents] = await Promise.all([
        getCalendarBatches(),
        getCalendarEvents(),
    ])

    return <EventCalendarClient profile={profile} initialBatches={batches} initialCalendarEvents={calendarEvents} />
}
