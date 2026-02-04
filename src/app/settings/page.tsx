"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    Lock,
    HelpCircle,
    Power,
    ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BottomNav } from "@/components/ui/bottom-nav"

// Mock user data
const currentUser = {
    name: "Budi Santoso",
    username: "budisantoso",
    role: "admin"
}

export default function SettingsPage() {
    const router = useRouter()

    const handleLogout = () => {
        // TODO: Handle actual logout
        console.log("Logging out...")
        router.push("/login")
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white px-4 pt-6 pb-4">
                <h1 className="text-2xl font-bold text-black">Pengaturan</h1>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 pb-24 md:max-w-2xl md:mx-auto md:w-full">
                {/* Profile Card */}
                <Card className="border-none shadow-sm mb-4">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                            {/* Avatar */}
                            <Avatar className="h-24 w-24 border-4 border-white shadow-lg mb-4">
                                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 text-2xl font-bold">
                                    {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>

                            {/* Name and Username */}
                            <h2 className="text-xl font-bold text-gray-900 mb-1">{currentUser.name}</h2>
                            <p className="text-gray-500 mb-4">@{currentUser.username}</p>

                            {/* Edit Profile Button */}
                            <Button
                                variant="outline"
                                className="rounded-full px-6 text-gray-700 border-gray-300 hover:bg-gray-50"
                            >
                                Edit Profil
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Menu Items */}
                <Card className="border-none shadow-sm mb-4">
                    <CardContent className="p-0">
                        {/* Change Password */}
                        <Link href="/settings/change-password">
                            <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                                        <Lock className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <span className="font-medium text-gray-900">Ubah Kata Sandi</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                        </Link>

                        {/* Help Center */}
                        <Link href="/settings/help">
                            <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                                        <HelpCircle className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <span className="font-medium text-gray-900">Pusat Bantuan</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                        </Link>
                    </CardContent>
                </Card>

                {/* Logout Card */}
                <Card className="border-none shadow-sm mb-6">
                    <CardContent className="p-0">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-4 w-full p-4 hover:bg-red-50 transition-colors"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                                <Power className="h-5 w-5 text-red-500" />
                            </div>
                            <span className="font-medium text-red-500">Keluar</span>
                        </button>
                    </CardContent>
                </Card>

                {/* Version Info */}
                <p className="text-center text-sm text-gray-400">
                    Versi 1.2.0 (Build 340)
                </p>
            </div>

            <BottomNav isAdmin={currentUser.role === "admin"} />
        </div>
    )
}
