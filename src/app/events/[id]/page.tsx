import { redirect } from "next/navigation"
import { getEventDetail } from "@/app/actions/event-detail"
import { EventDetailClient } from "./event-detail-client"

export const revalidate = 30

interface PageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ batch?: string }>
}

export default async function EventDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params
    const { batch } = await searchParams

    const data = await getEventDetail(id, batch)

    if (!data) {
        redirect('/dashboard')
    }

    return <EventDetailClient data={data} />
}
