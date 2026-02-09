"use client"

import * as React from "react"
import Link from "next/link"
import {
    Search,
    SlidersHorizontal,
    Users,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { BottomNav } from "@/components/ui/bottom-nav"
import { cn } from "@/lib/utils"

type FilterType = "all" | "unassigned" | "assigned"

interface TeamMember {
    id: string
    name: string
    role?: string
    emoji: string
    status: "assigned" | "unassigned" | "admin"
    eventsCount: number
}

// Mock Data
const teamMembers: TeamMember[] = [
    { id: "1", name: "Siti Rahma", emoji: "🌸", status: "unassigned", eventsCount: 0 },
    { id: "2", name: "Budi Santoso", emoji: "😎", status: "admin", eventsCount: 0, role: "Admin" },
    { id: "3", name: "Joko Widodo", emoji: "🦁", status: "assigned", eventsCount: 2 },
    { id: "4", name: "Dewi Putri", emoji: "🦋", status: "unassigned", eventsCount: 0 },
    { id: "5", name: "Rina Melati", emoji: "🌺", status: "assigned", eventsCount: 3 },
    { id: "6", name: "Ahmad Fauzi", emoji: "🚀", status: "assigned", eventsCount: 5 },
    { id: "7", name: "Lisa Permata", emoji: "💎", status: "unassigned", eventsCount: 0 },
]

export default function PeopleManagementPage() {
    const [activeFilter, setActiveFilter] = React.useState<FilterType>("all")
    const [searchQuery, setSearchQuery] = React.useState("")

    const filteredMembers = teamMembers.filter(member => {
        let matchesFilter = false
        if (activeFilter === "all") {
            matchesFilter = true
        } else if (activeFilter === "assigned") {
            matchesFilter = member.status === "assigned" || member.status === "admin"
        } else if (activeFilter === "unassigned") {
            matchesFilter = member.status === "unassigned"
        }

        const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const filterCounts = {
        all: teamMembers.length,
        unassigned: teamMembers.filter(m => m.status === "unassigned").length,
        assigned: teamMembers.filter(m => m.status === "assigned" || m.status === "admin").length,
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="bg-white px-4 pt-6 pb-4">
                <h1 className="text-2xl font-bold text-black">People</h1>
                <p className="text-sm text-gray-500">Manage your team assignments</p>
            </div>

            {/* Search and Filter */}
            <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-sm">
                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search names..."
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
                        All
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
                        <span className={cn(
                            "h-2 w-2 rounded-full",
                            activeFilter === "unassigned" ? "bg-orange-400" : "bg-orange-400"
                        )} />
                        Unassigned
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
                        <span className={cn(
                            "h-2 w-2 rounded-full",
                            activeFilter === "assigned" ? "bg-emerald-400" : "bg-emerald-400"
                        )} />
                        Assigned
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 pb-24 space-y-3">
                {filteredMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-gray-100 p-4">
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No members found</p>
                        <p className="text-sm text-gray-400">Try adjusting your search or filter</p>
                    </div>
                ) : (
                    filteredMembers.map((member) => (
                        <MemberCard key={member.id} member={member} />
                    ))
                )}
            </div>



            <BottomNav isAdmin />
        </div>
    )
}

function MemberCard({ member }: { member: TeamMember }) {
    const getStatusConfig = () => {
        switch (member.status) {
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
                        {/* Emoji Avatar */}
                        <AvatarEmoji
                            emoji={member.emoji}
                            size="md"
                            className="border-2 border-white shadow-sm"
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{member.name}</h3>
                            <div className="mt-1 flex items-center gap-2">
                                <span className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                    config.bgColor, config.textColor
                                )}>
                                    {config.label}
                                </span>
                                {member.eventsCount > 0 ? (
                                    <span className="text-xs text-gray-400">
                                        {member.eventsCount} Events
                                    </span>
                                ) : member.status !== "admin" && (
                                    <span className="text-xs text-gray-400">
                                        No Events
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
