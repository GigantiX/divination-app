"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
    ChevronLeft,
    Search,
    Plus,
    Briefcase,
    Megaphone,
    Loader2,
    Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
    getAssignableEvents,
    assignUserToEvent,
    type AssignableEvent,
} from "@/app/actions/people"

export default function AssignUserPage() {
    const params = useParams()
    const router = useRouter()
    const userId = params.id as string

    const [userName, setUserName] = React.useState("User")
    const [events, setEvents] = React.useState<AssignableEvent[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    const [searchQuery, setSearchQuery] = React.useState("")
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [selectedEvent, setSelectedEvent] = React.useState<AssignableEvent | null>(null)
    const [selectedRole, setSelectedRole] = React.useState<"pic" | "advertiser">("pic")
    const [isAssigning, setIsAssigning] = React.useState(false)
    const [assignSuccess, setAssignSuccess] = React.useState(false)

    React.useEffect(() => {
        const load = async () => {
            const result = await getAssignableEvents(userId)
            if (result.error) {
                setError(result.error)
            } else {
                setEvents(result.events || [])
                setUserName(result.userName || "User")
            }
            setIsLoading(false)
        }
        load()
    }, [userId])

    const filteredEvents = events.filter((event) =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleEventClick = (event: AssignableEvent) => {
        setSelectedEvent(event)
        setSelectedRole("pic")
        setIsDialogOpen(true)
        setAssignSuccess(false)
        setError(null)
    }

    const handleConfirm = async () => {
        if (!selectedEvent) return
        setIsAssigning(true)
        setError(null)

        const result = await assignUserToEvent(userId, selectedEvent.id, selectedRole)

        if (result.error) {
            setError(result.error)
            setIsAssigning(false)
            return
        }

        setAssignSuccess(true)
        setIsAssigning(false)

        // Redirect back to user detail after short delay
        setTimeout(() => {
            router.push(`/people/${userId}`)
            router.refresh()
        }, 1000)
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
                    <h1 className="text-xl font-bold text-black">Tugaskan {userName}</h1>
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
                    {!isLoading && (
                        <span className="text-sm text-gray-500">
                            Tersedia: {filteredEvents.length}
                        </span>
                    )}
                </div>

                {/* Event List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="mt-3 text-sm text-gray-500">Memuat event...</p>
                        </div>
                    ) : error && !isDialogOpen ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-red-500">{error}</p>
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <Card className="border-none shadow-sm">
                            <CardContent className="p-8 text-center">
                                <p className="text-gray-500">
                                    {events.length === 0
                                        ? "Semua event sudah ditugaskan ke user ini"
                                        : "Event tidak ditemukan"
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredEvents.map((event) => (
                            <Card key={event.id} className="border-none shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        {/* Event Logo */}
                                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-2xl overflow-hidden">
                                            {event.logoUrl ? (
                                                <img
                                                    src={event.logoUrl}
                                                    alt={event.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                "📋"
                                            )}
                                        </div>

                                        {/* Event Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 mb-1">
                                                {event.name}
                                            </h3>
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
                                                    <span className="font-medium">
                                                        {event.advertiserCount} Advertisers
                                                    </span>
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
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl overflow-hidden">
                                {selectedEvent.logoUrl ? (
                                    <img
                                        src={selectedEvent.logoUrl}
                                        alt={selectedEvent.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    "📋"
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                                    {selectedEvent.name}
                                </h4>
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
                            <button
                                onClick={() => setSelectedRole("pic")}
                                disabled={assignSuccess}
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all",
                                    selectedRole === "pic"
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                )}
                            >
                                <Briefcase className={cn(
                                    "h-8 w-8",
                                    selectedRole === "pic" ? "text-blue-500" : "text-gray-400"
                                )} />
                                <span className={cn(
                                    "text-sm font-semibold",
                                    selectedRole === "pic" ? "text-blue-500" : "text-gray-600"
                                )}>
                                    PIC
                                </span>
                                {selectedRole === "pic" && (
                                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                                        <Check className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </button>

                            <button
                                onClick={() => setSelectedRole("advertiser")}
                                disabled={assignSuccess}
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 transition-all",
                                    selectedRole === "advertiser"
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                )}
                            >
                                <Megaphone className={cn(
                                    "h-8 w-8",
                                    selectedRole === "advertiser" ? "text-blue-500" : "text-gray-400"
                                )} />
                                <span className={cn(
                                    "text-sm font-semibold",
                                    selectedRole === "advertiser" ? "text-blue-500" : "text-gray-600"
                                )}>
                                    Advertiser
                                </span>
                                {selectedRole === "advertiser" && (
                                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                                        <Check className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Error in dialog */}
                        {error && (
                            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Success in dialog */}
                        {assignSuccess && (
                            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
                                <Check className="h-4 w-4 text-green-600" />
                                <p className="text-sm text-green-600">
                                    Berhasil ditugaskan!
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setIsDialogOpen(false)
                                    setSelectedEvent(null)
                                    setError(null)
                                }}
                                disabled={isAssigning || assignSuccess}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                className="flex-1 h-12 rounded-2xl bg-blue-500 hover:bg-blue-600 text-base font-semibold"
                                disabled={isAssigning || assignSuccess}
                            >
                                {isAssigning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : assignSuccess ? (
                                    <>
                                        <Check className="h-4 w-4 mr-1" />
                                        Berhasil!
                                    </>
                                ) : (
                                    "Konfirmasi Penugasan"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
