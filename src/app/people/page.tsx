"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search,
    SlidersHorizontal,
    Users,
    Loader2,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { NavigationLayout } from "@/components/ui/nav-layout"
import { RoleBadge } from "@/components/ui/role-badge"
import { cn } from "@/lib/utils"
import { getPeopleList, type PeopleMember } from "@/app/actions/people"

type FilterType = "all" | "unassigned" | "assigned"

export default function PeopleManagementPage() {
    const [activeFilter, setActiveFilter] = React.useState<FilterType>("all")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [members, setMembers] = React.useState<PeopleMember[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        const load = async () => {
            const result = await getPeopleList()
            if (result.error) {
                setError(result.error)
            } else if (result.members) {
                setMembers(result.members)
            }
            setIsLoading(false)
        }
        load()
    }, [])

    const filteredMembers = members.filter(member => {
        let matchesFilter = false
        if (activeFilter === "all") {
            matchesFilter = true
        } else if (activeFilter === "assigned") {
            matchesFilter = member.status === "assigned" || member.status === "admin" || member.status === "developer"
        } else if (activeFilter === "unassigned") {
            matchesFilter = member.status === "unassigned"
        }

        const matchesSearch =
            member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.username.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const filterCounts = {
        all: members.length,
        unassigned: members.filter(m => m.status === "unassigned").length,
        assigned: members.filter(m => m.status !== "unassigned").length,
    }

    return (
        <NavigationLayout isAdmin={true}>
            {/* Header */}
            <div className="bg-white px-4 pt-6 pb-4">
                <h1 className="text-2xl font-bold text-black">People</h1>
                <p className="text-sm text-gray-500">Kelola penugasan tim Anda</p>
            </div>

            {/* Search and Filter */}
            <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-sm">
                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Cari nama atau username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 pl-10 pr-10 rounded-xl bg-gray-50 border-none"
                    />
                    <SlidersHorizontal className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveFilter("all")}
                        className={cn(
                            "rounded-full px-4 py-2 text-sm font-medium transition-all",
                            activeFilter === "all"
                                ? "bg-gray-800 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        All ({filterCounts.all})
                    </button>
                    <button
                        onClick={() => setActiveFilter("unassigned")}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                            activeFilter === "unassigned"
                                ? "bg-gray-800 text-white"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                    >
                        <span className="h-2 w-2 rounded-full bg-orange-400" />
                        Unassigned ({filterCounts.unassigned})
                    </button>
                    <button
                        onClick={() => setActiveFilter("assigned")}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                            activeFilter === "assigned"
                                ? "bg-gray-800 text-white"
                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Assigned ({filterCounts.assigned})
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 pb-24 space-y-3">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-3 text-sm text-gray-500">Memuat data...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-red-500 font-medium">{error}</p>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-gray-100 p-4">
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500">Tidak ada anggota ditemukan</p>
                        <p className="text-sm text-gray-400">Coba ubah pencarian atau filter</p>
                    </div>
                ) : (
                    filteredMembers.map((member) => (
                        <MemberCard key={member.id} member={member} />
                    ))
                )}
            </div>
        </NavigationLayout>
    )
}

function MemberCard({ member }: { member: PeopleMember }) {
    const getStatusConfig = () => {
        switch (member.status) {
            case "developer":
                return { label: "Developer", bgColor: "bg-purple-50", textColor: "text-purple-500" }
            case "admin":
                return { label: "Admin", bgColor: "bg-blue-50", textColor: "text-blue-500" }
            case "assigned":
                return { label: "Assigned", bgColor: "bg-emerald-50", textColor: "text-emerald-500" }
            case "unassigned":
                return { label: "Unassigned", bgColor: "bg-orange-50", textColor: "text-orange-500" }
        }
    }

    const config = getStatusConfig()

    return (
        <Link href={`/people/${member.id}`}>
            <Card className="border-none shadow-sm cursor-pointer transition-all hover:shadow-md">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <AvatarEmoji
                            emoji={member.emoji}
                            size="md"
                            className="border-2 border-white shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{member.name}</h3>
                            <p className="text-xs text-gray-400 truncate">@{member.username}</p>
                            <div className="mt-1 flex items-center gap-2">
                                <span className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                    config.bgColor, config.textColor
                                )}>
                                    {config.label}
                                </span>
                                {member.status !== "admin" && member.status !== "developer" && (
                                    <span className="text-xs text-gray-400">
                                        {member.eventsCount > 0
                                            ? `${member.eventsCount} Event${member.eventsCount > 1 ? 's' : ''}`
                                            : "No Events"
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
