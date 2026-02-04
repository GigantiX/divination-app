"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
    ChevronLeft,
    Plus
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface AssignedEvent {
    id: string
    name: string
    role: "PIC" | "Advertiser" | "Support"
}

interface UserDetail {
    id: string
    name: string
    username: string
    isOnline: boolean
    assignedEvents: AssignedEvent[]
}

// Mock Data
const getUserData = (id: string): UserDetail => {
    const users: Record<string, UserDetail> = {
        "1": {
            id: "1",
            name: "Siti Rahma",
            username: "sitirahma",
            isOnline: true,
            assignedEvents: [
                { id: "1", name: "Jakarta Tech Summit", role: "PIC" },
                { id: "2", name: "Bali Music Festival", role: "Advertiser" },
                { id: "3", name: "Surabaya Culinary Expo", role: "Support" }
            ]
        },
        "2": {
            id: "2",
            name: "Budi Santoso",
            username: "budisantoso",
            isOnline: false,
            assignedEvents: []
        },
        "3": {
            id: "3",
            name: "Joko Widodo",
            username: "jokowi",
            isOnline: true,
            assignedEvents: [
                { id: "1", name: "Meta Ads Campaign Q1 2024", role: "PIC" },
                { id: "4", name: "Google Ads Summer Sale", role: "Advertiser" }
            ]
        }
    }
    return users[id] || users["1"]
}

const getRoleBadgeStyle = (role: "PIC" | "Advertiser" | "Support") => {
    switch (role) {
        case "PIC":
            return { bgColor: "bg-blue-50", textColor: "text-blue-600" }
        case "Advertiser":
            return { bgColor: "bg-purple-50", textColor: "text-purple-600" }
        case "Support":
            return { bgColor: "bg-orange-50", textColor: "text-orange-600" }
    }
}

export default function UserDetailPage() {
    const params = useParams()
    const userId = params.id as string
    const user = getUserData(userId)

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/people">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-black">User Details</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:max-w-2xl md:mx-auto md:w-full">
                {/* Profile Section */}
                <div className="flex flex-col items-center text-center mb-8">
                    {/* Avatar with Online Indicator */}
                    <div className="relative mb-4">
                        <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                            <AvatarFallback className="bg-gradient-to-br from-orange-200 to-orange-300 text-gray-800 text-3xl font-bold">
                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                        {user.isOnline && (
                            <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-white bg-emerald-500" />
                        )}
                    </div>

                    {/* Name and Username */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
                    <p className="text-gray-500">@{user.username}</p>
                </div>

                {/* Assign to Event Button */}
                <Link href={`/people/${userId}/assign`}>
                    <Button className="w-full h-14 rounded-2xl text-base font-semibold mb-8 bg-blue-500 hover:bg-blue-600">
                        <Plus className="h-5 w-5 mr-2" />
                        Assign to Event
                    </Button>
                </Link>

                {/* Assigned Events Section */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Assigned Events</h3>

                    {user.assignedEvents.length === 0 ? (
                        <Card className="border-none shadow-sm">
                            <CardContent className="p-8 text-center">
                                <p className="text-gray-500">No events assigned yet</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {user.assignedEvents.map((event) => {
                                const roleStyle = getRoleBadgeStyle(event.role)
                                return (
                                    <Card key={event.id} className="border-none shadow-sm">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 mb-2">{event.name}</h4>
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                                                        roleStyle.bgColor,
                                                        roleStyle.textColor
                                                    )}>
                                                        {event.role}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 font-semibold"
                                                >
                                                    Revoke
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
