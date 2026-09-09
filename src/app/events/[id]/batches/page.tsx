import { redirect } from "next/navigation"

import { getEventBatches } from "@/app/actions/batches"
import { BatchListClient } from "./batch-list-client"

export const dynamic = "force-dynamic"

interface BatchListPageProps {
    params: Promise<{ id: string }>
}

export default async function BatchListPage({ params }: BatchListPageProps) {
    const { id } = await params
    const data = await getEventBatches(id)

    if (!data) {
        redirect('/dashboard')
    }

    return <BatchListClient data={data} />
}
