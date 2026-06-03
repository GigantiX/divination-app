import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfile } from "@/app/actions/profile"
import { BudgetClient } from "./budget-client"

export const metadata = {
    title: "Request Budget - Divination",
    description: "Form request budget iklan",
}

export default async function RequestBudgetPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const profile = await getProfile()

    if (!profile) {
        redirect("/login")
    }

    return <BudgetClient profile={profile} />
}
