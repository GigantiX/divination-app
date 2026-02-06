"use client"

import Link from "next/link"
import { ChevronLeft, Mail, Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SupportContact {
    id: string
    name: string
    email: string
    type: "admin" | "dev"
    role?: string
}

const adminSupport: SupportContact[] = [
    { id: "1", name: "Budi Santoso", email: "budi.santoso@admin.id", type: "admin" },
    { id: "2", name: "Siti Aminah", email: "siti.help@divination.id", type: "admin" },
]

const devTeam: SupportContact[] = [
    { id: "3", name: "Rizky Ramadhan", email: "rizky@dev.com", type: "dev", role: "Technical Lead" },
    { id: "4", name: "Linda Kusuma", email: "linda@dev.com", type: "dev", role: "Backend Specialist" },
]

export default function HelpCenterPage() {
    return (
        <div className="flex min-h-screen flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-black">Pusat Bantuan</h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:max-w-2xl md:mx-auto md:w-full">
                {/* Admin Support Section */}
                <div className="mb-6">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                        Admin Support
                    </h2>
                    <div className="space-y-3">
                        {adminSupport.map((contact) => (
                            <Card key={contact.id} className="border-none shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-semibold">
                                                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                                                <p className="text-sm text-gray-500">{contact.email}</p>
                                            </div>
                                        </div>
                                        <a
                                            href={`mailto:${contact.email}`}
                                            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                        >
                                            <Mail className="h-5 w-5 text-emerald-500" />
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Dev Team Section */}
                <div className="mb-8">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                        Tim Pengembang
                    </h2>
                    <div className="space-y-3">
                        {devTeam.map((contact) => (
                            <Card key={contact.id} className="border-none shadow-sm border-l-4 border-l-pink-400">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700 font-semibold">
                                                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                                                <p className="text-sm text-pink-500 font-medium">{contact.role}</p>
                                                <p className="text-sm text-gray-500">{contact.email}</p>
                                            </div>
                                        </div>
                                        <Settings2 className="h-5 w-5 text-gray-300" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Online Customer Service Badge */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm border border-gray-100">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        <span className="text-sm font-medium text-gray-700">Layanan Pelanggan Online</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center space-y-1">
                    <p className="text-sm text-gray-400">Divination Dashboard v1.2.0</p>
                    <p className="text-xs text-gray-400">Untuk bantuan mendesak, silakan hubungi Admin.</p>
                </div>
            </div>
        </div>
    )
}
