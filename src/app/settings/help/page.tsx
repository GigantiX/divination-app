"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, Mail, Settings2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarEmoji } from "@/components/ui/avatar-emoji"
import { getHelpContacts, type HelpContact } from "@/app/actions/settings"

export default function HelpCenterPage() {
    const [admins, setAdmins] = React.useState<HelpContact[]>([])
    const [developers, setDevelopers] = React.useState<HelpContact[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const load = async () => {
            const result = await getHelpContacts()
            if (!result.error) {
                setAdmins(result.admins || [])
                setDevelopers(result.developers || [])
            }
            setIsLoading(false)
        }
        load()
    }, [])

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
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-3 text-sm text-gray-500">Memuat kontak...</p>
                    </div>
                ) : (
                    <>
                        {/* Admin Support Section */}
                        {admins.length > 0 && (
                            <div className="mb-6">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                                    Admin Support
                                </h2>
                                <div className="space-y-3">
                                    {admins.map((contact) => (
                                        <ContactCard key={contact.id} contact={contact} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dev Team Section */}
                        {developers.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                                    Tim Pengembang
                                </h2>
                                <div className="space-y-3">
                                    {developers.map((contact) => (
                                        <ContactCard
                                            key={contact.id}
                                            contact={contact}
                                            isDev
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {admins.length === 0 && developers.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-gray-500">Tidak ada kontak bantuan tersedia</p>
                            </div>
                        )}

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
                    </>
                )}
            </div>
        </div>
    )
}

function ContactCard({ contact, isDev }: { contact: HelpContact; isDev?: boolean }) {
    return (
        <Card className={`border-none shadow-sm ${isDev ? "border-l-4 border-l-pink-400" : ""}`}>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AvatarEmoji
                            emoji={contact.emoji}
                            size="md"
                            className="border-2 border-white shadow-sm"
                        />
                        <div>
                            <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                            {isDev && (
                                <p className="text-sm text-pink-500 font-medium">Developer</p>
                            )}
                            <p className="text-sm text-gray-500">@{contact.username}</p>
                        </div>
                    </div>
                    {isDev ? (
                        <Settings2 className="h-5 w-5 text-gray-300" />
                    ) : (
                        <a
                            href={`mailto:${contact.username}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                            <Mail className="h-5 w-5 text-emerald-500" />
                        </a>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
