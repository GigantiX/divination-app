"use client"

import * as React from "react"
import Link from "next/link"
import { WalletCards, Database, ChevronRight, Clock3, Settings2, Wrench } from "lucide-react"

import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type UserProfile } from "@/app/actions/profile"
import { cn } from "@/lib/utils"

interface AppsClientProps {
    profile: UserProfile
}

type Feature = {
    id: string
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    iconColor: string
    iconBg: string
}

const features: Feature[] = [
    {
        id: "request-budget",
        title: "Request Budget",
        description: "Form request budget iklan untuk Advertiser",
        icon: WalletCards,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100",
    },
    {
        id: "lead-database",
        title: "Lead Database",
        description: "Upload kontak peserta Webinar, Seminar hingga Workshop",
        icon: Database,
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-100",
    },
]

export function AppsClient({ profile }: AppsClientProps) {
    const isAdmin = profile.role === "admin" || profile.role === "developer"
    const [comingSoonFeature, setComingSoonFeature] = React.useState<Feature | null>(null)

    return (
        <NavigationLayout isAdmin={isAdmin}>
            <div className="flex-1 p-4 pb-24 md:mx-auto md:w-full md:max-w-3xl md:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Apps</h1>
                    <p className="mt-1 text-sm text-gray-500">Pilih fitur untuk mendukung operasional tim Anda.</p>
                </div>

                {isAdmin && (
                    <Link href="/apps/settings" className="mb-4 block">
                        <Card className="border border-blue-100 bg-blue-50/60 shadow-sm transition-all hover:bg-blue-50">
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                                        <Settings2 className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Apps Settings</p>
                                        <p className="text-xs text-gray-500">Atur visibilitas app per role (sementara placeholder)</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-blue-400" />
                            </CardContent>
                        </Card>
                    </Link>
                )}

                <div className="space-y-3">
                    {features.map((feature) => {
                        const Icon = feature.icon
                        
                        // Determine the correct href based on feature id and role
                        let featureHref: string | null = null
                        if (feature.id === "request-budget") {
                            featureHref = "/apps/request-budget"
                        } else if (feature.id === "lead-database") {
                            featureHref = isAdmin
                                ? "/apps/lead-database"
                                : "/apps/lead-database/upload"
                        }

                        // Render as a link if the feature has a route
                        if (featureHref) {
                            return (
                                <Link
                                    key={feature.id}
                                    href={featureHref}
                                    className="w-full text-left block"
                                >
                                    <Card className="border-none shadow-sm transition-all hover:shadow-md">
                                        <CardContent className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", feature.iconBg)}>
                                                    <Icon className={cn("h-6 w-6", feature.iconColor)} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{feature.title}</p>
                                                    <p className="text-sm text-gray-500">{feature.description}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-gray-400" />
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        }

                        // Fallback: WIP features
                        return (
                            <button
                                key={feature.id}
                                type="button"
                                onClick={() => setComingSoonFeature(feature)}
                                className="w-full text-left"
                            >
                                <Card className="border-none shadow-sm transition-all hover:shadow-md">
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", feature.iconBg)}>
                                                <Icon className={cn("h-6 w-6", feature.iconColor)} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{feature.title}</p>
                                                <p className="text-sm text-gray-500">{feature.description}</p>
                                            </div>
                                        </div>
                                        <div className="ml-3 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                            <Clock3 className="h-3.5 w-3.5" /> WIP
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        )
                    })}
                </div>
            </div>

            {comingSoonFeature && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-sm border-none shadow-xl">
                        <CardContent className="p-6 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                                <Wrench className="h-7 w-7 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Coming Soon</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Fitur <span className="font-semibold text-gray-700">{comingSoonFeature.title}</span> sedang dalam proses pengembangan.
                            </p>
                            <Button
                                className="mt-5 h-10 w-full"
                                onClick={() => setComingSoonFeature(null)}
                            >
                                Mengerti
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </NavigationLayout>
    )
}
