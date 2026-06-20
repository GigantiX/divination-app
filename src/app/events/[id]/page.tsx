import { redirect } from "next/navigation"
import { getEventDetail, type DateRange } from "@/app/actions/event-detail"
import { EventDetailClient } from "./event-detail-client"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ batch?: string; range?: string }>
}

export default async function EventDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params
    const { batch, range } = await searchParams

    const validRange: DateRange = (range === 'today' || range === 'yesterday' || range === '7d' || range === '30d' || range === 'all') ? range : 'today'
    const data = await getEventDetail(id, batch, validRange)

    if (!data) {
        redirect('/dashboard')
    }

    return <EventDetailClient data={data} />
}
