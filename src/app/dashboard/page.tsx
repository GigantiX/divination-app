"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { BottomNav } from "@/components/ui/bottom-nav"

// Mock data - will be replaced with actual DB data later
const mockEvents = {
    active: [
        {
            id: "1",
            name: "Meta Ads Campaign Q1 2024",
            logo: null,
            batchCount: 3,
            status: "active",
        },
        {
            id: "2",
            name: "E-commerce Sales Boost",
            logo: null,
            batchCount: 5,
            status: "active",
        },
        {
            id: "3",
            name: "Brand Awareness Drive",
            logo: null,
            batchCount: 2,
            status: "active",
        },
    ],
    inactive: [
        {
            id: "4",
            name: "Holiday Campaign 2023",
            logo: null,
            batchCount: 4,
            status: "inactive",
        },
    ],
}

const mockUser = {
    role: "admin", // Role: 'admin' | 'pic' | 'advertiser'
    displayName: "Admin",
}

export default function DashboardPage() {
    const [activeEvents, setActiveEvents] = React.useState(mockEvents.active)
    const [inactiveEvents, setInactiveEvents] = React.useState(mockEvents.inactive)
    const [modalConfig, setModalConfig] = React.useState<{
        isOpen: boolean
        eventId: string | null
        eventName: string | null
        currentStatus: string | null
    }>({
        isOpen: false,
        eventId: null,
        eventName: null,
        currentStatus: null,
    })

    const handleToggleClick = (eventId: string, currentStatus: string, eventName: string) => {
        setModalConfig({
            isOpen: true,
            eventId,
            eventName,
            currentStatus,
        })
    }

    const confirmToggle = () => {
        const { eventId, currentStatus } = modalConfig
        if (!eventId || !currentStatus) return

        if (currentStatus === "active") {
            const eventToMove = activeEvents.find(e => e.id === eventId)
            if (eventToMove) {
                setActiveEvents(activeEvents.filter(e => e.id !== eventId))
                setInactiveEvents([...inactiveEvents, { ...eventToMove, status: "inactive" }])
            }
        } else {
            const eventToMove = inactiveEvents.find(e => e.id === eventId)
            if (eventToMove) {
                setInactiveEvents(inactiveEvents.filter(e => e.id !== eventId))
                setActiveEvents([...activeEvents, { ...eventToMove, status: "active" }])
            }
        }
        setModalConfig({ isOpen: false, eventId: null, eventName: null, currentStatus: null })
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-black">DIVINATION</h1>
                    <Link href="/settings">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                            <span className="text-sm font-semibold">
                                {mockUser.displayName.charAt(0)}
                            </span>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-text-primary">
                        Selamat datang,
                    </h2>
                    <p className="text-2xl font-semibold text-text-primary">
                        {mockUser.displayName} 👋
                    </p>
                </div>

                {/* Active Events Section */}
                <div className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-text-primary">
                            Active Events
                        </h3>
                        {mockUser.role === "admin" && (
                            <span className="text-sm text-text-secondary">
                                {activeEvents.length} event{activeEvents.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    {activeEvents.length === 0 ? (
                        <Card className="p-8 text-center">
                            <p className="text-text-secondary">Tidak ada event aktif</p>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {activeEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    userRole={mockUser.role}
                                    onToggleClick={handleToggleClick}
                                />
                            ))}
                        </div>
                    )}

                    {/* Add New Event Button (Admin Only) */}
                    {mockUser.role === "admin" && (
                        <Link href="/events/new">
                            <Button
                                variant="outline"
                                className="mt-6 w-full border-2 border-dashed border-primary bg-transparent text-primary hover:bg-primary/5"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                New Event
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Inactive Events Section (Admin Only) */}
                {mockUser.role === "admin" && inactiveEvents.length > 0 && (
                    <div className="mb-8">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-text-secondary">
                                Inactive Events
                            </h3>
                            <span className="text-sm text-text-secondary">
                                {inactiveEvents.length} event{inactiveEvents.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        <div className="space-y-6">
                            {inactiveEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    userRole={mockUser.role}
                                    onToggleClick={handleToggleClick}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <BottomNav isAdmin={mockUser.role === "admin"} />
            {/* Confirmation Modal */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <h3 className="text-lg font-semibold">Konfirmasi Perubahan</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-text-secondary">
                                Apakah anda yakin ingin mengubah status event <span className="font-semibold text-text-primary">{modalConfig.eventName}</span> menjadi{" "}
                                <span className={`font-bold ${modalConfig.currentStatus === "active" ? "text-red-500" : "text-green-500"}`}>
                                    {modalConfig.currentStatus === "active" ? "Inactive" : "Active"}
                                </span>?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setModalConfig({ isOpen: false, eventId: null, eventName: null, currentStatus: null })}
                                >
                                    Batal
                                </Button>
                                <Button
                                    className={modalConfig.currentStatus === "active" ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
                                    onClick={confirmToggle}
                                >
                                    Ya, Ubah
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

interface EventCardProps {
    event: {
        id: string
        name: string
        logo: string | null
        batchCount: number
        status: string
    }
    userRole: string
    onToggleClick: (eventId: string, currentStatus: string, eventName: string) => void
}

function EventCard({ event, userRole, onToggleClick }: EventCardProps) {
    const isActive = event.status === "active"

    return (
        <Link href={`/events/${event.id}`}>
            <Card className={`overflow-hidden transition-all hover:shadow-md ${!isActive ? "opacity-70" : ""}`}>
                <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                        {/* Event Logo Placeholder */}
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            {event.logo ? (
                                <img
                                    src={event.logo}
                                    alt={event.name}
                                    className="h-full w-full rounded-lg object-cover"
                                />
                            ) : (
                                <Calendar className="h-8 w-8 text-primary" />
                            )}
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="truncate font-semibold text-text-primary">
                                {event.name}
                            </h4>
                            <p className="text-sm text-text-secondary">
                                {event.batchCount} Batch{event.batchCount !== 1 ? "es" : ""}
                            </p>

                            {/* Status Badge */}
                            {userRole === "admin" && (
                                <div className="mt-2 flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            onToggleClick(event.id, event.status, event.name)
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-red-500"
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-6" : "translate-x-1"
                                                }`}
                                        />
                                    </button>
                                    <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-red-500"}`}>
                                        {isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
