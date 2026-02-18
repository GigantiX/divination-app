import { redirect } from "next/navigation"
import { getDashboardData } from "@/app/actions/dashboard"
import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
    const data = await getDashboardData()

    if (!data) {
        redirect('/login')
    }

    return <DashboardClient data={data} />
}
