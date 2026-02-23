"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar, Plus, Inbox, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { BottomNav } from "@/components/ui/bottom-nav"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { RoleBadge } from "@/components/ui/role-badge"
import { toggleEventStatus, type DashboardData, type DashboardEvent } from "@/app/actions/dashboard"

interface DashboardClientProps {
    data: DashboardData
}

export function DashboardClient({ data }: DashboardClientProps) {
    const router = useRouter()
    const { user, activeEvents: initialActive, inactiveEvents: initialInactive } = data

    const [activeEvents, setActiveEvents] = React.useState(initialActive)
    const [inactiveEvents, setInactiveEvents] = React.useState(initialInactive)
    const [isToggling, setIsToggling] = React.useState<string | null>(null)
    const [modalConfig, setModalConfig] = React.useState<{
        isOpen: boolean
        eventId: string | null
        eventName: string | null
        currentStatus: 'active' | 'completed' | 'upcoming' | null
    }>({
        isOpen: false,
        eventId: null,
        eventName: null,
        currentStatus: null,
    })

    const isAdmin = user.role === 'admin' || user.role === 'developer'
    const hasNoEvents = activeEvents.length === 0 && inactiveEvents.length === 0

    const handleToggleClick = (eventId: string, currentStatus: 'active' | 'completed' | 'upcoming', eventName: string) => {
        setModalConfig({
            isOpen: true,
            eventId,
            eventName,
            currentStatus,
        })
    }

    const confirmToggle = async () => {
        const { eventId, currentStatus } = modalConfig
        if (!eventId || !currentStatus) return

        setIsToggling(eventId)
        const newStatus = currentStatus === 'active' ? 'completed' : 'active'

        const result = await toggleEventStatus(eventId, newStatus)

        if (result.success) {
            if (currentStatus === 'active') {
                const eventToMove = activeEvents.find(e => e.id === eventId)
                if (eventToMove) {
                    setActiveEvents(activeEvents.filter(e => e.id !== eventId))
                    setInactiveEvents([...inactiveEvents, { ...eventToMove, status: 'completed' as const }])
                }
            } else {
                const eventToMove = inactiveEvents.find(e => e.id === eventId)
                if (eventToMove) {
                    setInactiveEvents(inactiveEvents.filter(e => e.id !== eventId))
                    setActiveEvents([...activeEvents, { ...eventToMove, status: 'active' }])
                }
            }
        }

        setIsToggling(null)
        setModalConfig({ isOpen: false, eventId: null, eventName: null, currentStatus: null })
    }

    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-black">DIVINATION</h1>
                    <Link href="/settings">
                        <AvatarEmoji
                            emoji={user.emoji}
                            size="md"
                            className="border-2 border-white shadow-md"
                        />
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
                {/* Welcome Section with Role Badge */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-text-primary">
                        Selamat datang,
                    </h2>
                    <p className="text-2xl font-semibold text-text-primary mb-2">
                        {user.displayName} 👋
                    </p>
                    <RoleBadge role={user.role} />
                </div>

                {/* Empty State for Unassigned Users */}
                {!isAdmin && hasNoEvents && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-6 rounded-full bg-gray-100 p-6">
                            <Inbox className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Belum Ada Event
                        </h3>
                        <p className="text-gray-500 max-w-xs">
                            Anda belum memiliki akses ke event apapun. Hubungi Admin untuk mendapatkan akses.
                        </p>
                    </div>
                )}

                {/* Active Events Section */}
                {(isAdmin || activeEvents.length > 0) && (
                    <div className="mb-8">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-text-primary">
                                Active Events
                            </h3>
                            {isAdmin && (
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
                            <div className="space-y-4">
                                {activeEvents.map((event) => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        isAdmin={isAdmin}
                                        isToggling={isToggling === event.id}
                                        onToggleClick={handleToggleClick}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Add New Event Button (Admin Only) */}
                        {isAdmin && (
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
                )}

                {/* Inactive Events Section (Admin Only) */}
                {isAdmin && inactiveEvents.length > 0 && (
                    <div className="mb-8">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-text-secondary">
                                Inactive Events
                            </h3>
                            <span className="text-sm text-text-secondary">
                                {inactiveEvents.length} event{inactiveEvents.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {inactiveEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    isAdmin={isAdmin}
                                    isToggling={isToggling === event.id}
                                    onToggleClick={handleToggleClick}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <BottomNav isAdmin={isAdmin} />

            {/* Confirmation Modal */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <h3 className="text-lg font-semibold">Konfirmasi Perubahan</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-text-secondary">
                                Apakah anda yakin ingin mengubah status event{" "}
                                <span className="font-semibold text-text-primary">
                                    {modalConfig.eventName}
                                </span>{" "}
                                menjadi{" "}
                                <span className={`font-bold ${modalConfig.currentStatus === "active" ? "text-red-500" : "text-green-500"}`}>
                                    {modalConfig.currentStatus === "active" ? "Inactive" : "Active"}
                                </span>?
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setModalConfig({ isOpen: false, eventId: null, eventName: null, currentStatus: null })}
                                    disabled={isToggling !== null}
                                >
                                    Batal
                                </Button>
                                <Button
                                    className={modalConfig.currentStatus === "active" ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
                                    onClick={confirmToggle}
                                    disabled={isToggling !== null}
                                >
                                    {isToggling ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Mengubah...
                                        </>
                                    ) : (
                                        "Ya, Ubah"
                                    )}
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
    event: DashboardEvent
    isAdmin: boolean
    isToggling: boolean
    onToggleClick: (eventId: string, currentStatus: 'active' | 'completed' | 'upcoming', eventName: string) => void
}

function EventCard({ event, isAdmin, isToggling, onToggleClick }: EventCardProps) {
    const isActive = event.status === "active"

    return (
        <Link href={`/events/${event.id}`}>
            <Card className={`overflow-hidden transition-all hover:shadow-md ${!isActive ? "opacity-70" : ""}`}>
                <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                        {/* Event Logo */}
                        <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                            {event.logo_url ? (
                                <Image
                                    src={event.logo_url}
                                    alt={event.name}
                                    fill
                                    sizes="64px"
                                    className="rounded-lg object-cover"
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

                            {/* Status Toggle (Admin Only) */}
                            {isAdmin && (
                                <div className="mt-2 flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            onToggleClick(event.id, event.status, event.name)
                                        }}
                                        disabled={isToggling}
                                        aria-label={isActive ? "Deactivate event" : "Activate event"}
                                        className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center ${isToggling ? "opacity-50" : ""}`}
                                    >
                                        <span
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-red-500"}`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`}
                                            />
                                        </span>
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
