"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
    ChevronLeft,
    Search,
    Plus,
    Briefcase,
    Megaphone
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Event {
    id: string
    name: string
    icon: string
    iconBg: string
    picCount: number
    advertiserCount: number
}

// Mock Data
const events: Event[] = [
    {
        id: "1",
        name: "Startup Bootcamp 2024",
        icon: "🔥",
        iconBg: "bg-orange-100",
        picCount: 1,
        advertiserCount: 3
    },
    {
        id: "2",
        name: "Jogja Rock Festival",
        icon: "🎵",
        iconBg: "bg-purple-100",
        picCount: 2,
        advertiserCount: 8
    },
    {
        id: "3",
        name: "UMKM Expo Surabaya",
        icon: "🏪",
        iconBg: "bg-emerald-100",
        picCount: 0,
        advertiserCount: 2
    },
    {
        id: "4",
        name: "Jakarta Art Week",
        icon: "🎨",
        iconBg: "bg-pink-100",
        picCount: 1,
        advertiserCount: 4
    }
]

const getUserName = (id: string): string => {
    const names: Record<string, string> = {
        "1": "Siti Rahma",
        "2": "Budi Santoso",
        "3": "Joko Widodo"
    }
    return names[id] || "User"
}

export default function AssignUserPage() {
    const params = useParams()
    const userId = params.id as string
    const userName = getUserName(userId)

    const [searchQuery, setSearchQuery] = React.useState("")
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null)
    const [selectedRole, setSelectedRole] = React.useState<"PIC" | "Advertiser">("PIC")

    const filteredEvents = events.filter(event =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event)
        setSelectedRole("PIC")
        setIsDialogOpen(true)
    }

    const handleConfirm = () => {
        // TODO: Handle assignment API call
        console.log(`Assigning ${userName} as ${selectedRole} to ${selectedEvent?.name}`)
        setIsDialogOpen(false)
        setSelectedEvent(null)
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href={`/people/${userId}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-black">Assign {userName}</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:max-w-2xl md:mx-auto md:w-full">
                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Cari event..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 pl-11 rounded-xl bg-white border-gray-200"
                    />
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Pilih Event</h2>
                    <span className="text-sm text-gray-500">Available: {filteredEvents.length}</span>
                </div>

                {/* Event List */}
                <div className="space-y-3">
                    {filteredEvents.length === 0 ? (
                        <Card className="border-none shadow-sm">
                            <CardContent className="p-8 text-center">
                                <p className="text-gray-500">No events found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredEvents.map((event) => (
                            <Card key={event.id} className="border-none shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        {/* Event Icon */}
                                        <div className={cn(
                                            "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-2xl",
                                            event.iconBg
                                        )}>
                                            {event.icon}
                                        </div>

                                        {/* Event Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 mb-1">{event.name}</h3>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Briefcase className="h-3.5 w-3.5" />
                                                    <span className={cn(
                                                        "font-medium",
                                                        event.picCount === 0 && "text-orange-500"
                                                    )}>
                                                        {event.picCount} PIC
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Megaphone className="h-3.5 w-3.5" />
                                                    <span className="font-medium">{event.advertiserCount} Advertisers</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Add Button */}
                                        <Button
                                            size="icon"
                                            className="h-12 w-12 rounded-full bg-blue-500 hover:bg-blue-600 flex-shrink-0"
                                            onClick={() => handleEventClick(event)}
                                        >
                                            <Plus className="h-6 w-6 text-white" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Role Selection Dialog */}
            {isDialogOpen && selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
                        {/* Dialog Header */}
                        <h3 className="text-center text-lg font-bold text-gray-900 mb-1">
                            Pilih Peran untuk
                        </h3>
                        <p className="text-center text-lg font-bold text-blue-500 mb-6">
                            {userName}
                        </p>

                        {/* Event Info */}
                        <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
                            <div className={cn(
                                "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl",
                                selectedEvent.iconBg
                            )}>
                                {selectedEvent.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm mb-1">{selectedEvent.name}</h4>
                                <p className="text-xs text-gray-500">
                                    <span className={selectedEvent.picCount === 0 ? "text-orange-500" : ""}>
                                        {selectedEvent.picCount} PIC
                                    </span>
                                    {" · "}
                                    {selectedEvent.advertiserCount} Advertisers
                                </p>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {/* PIC Button */}
                            <button
                                onClick={() => setSelectedRole("PIC")}
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all",
                                    selectedRole === "PIC"
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                )}
                            >
                                <Briefcase className={cn(
                                    "h-8 w-8",
                                    selectedRole === "PIC" ? "text-blue-500" : "text-gray-400"
                                )} />
                                <span className={cn(
                                    "text-sm font-semibold",
                                    selectedRole === "PIC" ? "text-blue-500" : "text-gray-600"
                                )}>
                                    PIC
                                </span>
                                {selectedRole === "PIC" && (
                                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>

                            {/* Advertiser Button */}
                            <button
                                onClick={() => setSelectedRole("Advertiser")}
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all",
                                    selectedRole === "Advertiser"
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                )}
                            >
                                <Megaphone className={cn(
                                    "h-8 w-8",
                                    selectedRole === "Advertiser" ? "text-blue-500" : "text-gray-400"
                                )} />
                                <span className={cn(
                                    "text-sm font-semibold",
                                    selectedRole === "Advertiser" ? "text-blue-500" : "text-gray-600"
                                )}>
                                    Advertiser
                                </span>
                                {selectedRole === "Advertiser" && (
                                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Confirm Button */}
                        <Button
                            onClick={handleConfirm}
                            className="w-full h-12 rounded-2xl bg-blue-500 hover:bg-blue-600 text-base font-semibold"
                        >
                            Konfirmasi Penugasan
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
