"use client"

import * as React from "react"
import Link from "next/link"
import { WalletCards, Database, ChevronRight, Clock3, Settings2, Wrench, Calendar } from "lucide-react"

import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type UserProfile } from "@/app/actions/profile"
import { cn } from "@/lib/utils"
import { AppIcon } from "@/components/ui/app-icon"

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
        iconColor: "text-primary",
        iconBg: "bg-primary/15",
    },
    {
        id: "lead-database",
        title: "Lead Database",
        description: "Upload kontak peserta Webinar, Seminar hingga Workshop",
        icon: Database,
        iconColor: "text-success",
        iconBg: "bg-success/15",
    },
    {
        id: "event-calendar",
        title: "Event Calendar",
        description: "Kalender jadwal event dan batch terintegrasi",
        icon: Calendar,
        iconColor: "text-primary",
        iconBg: "bg-primary/15",
    },
]

export function AppsClient({ profile }: AppsClientProps) {
    const isAdmin = profile.role === "admin" || profile.role === "developer"
    const [comingSoonFeature, setComingSoonFeature] = React.useState<Feature | null>(null)

    return (
        <NavigationLayout isAdmin={isAdmin}>
            <div className="flex-1 p-4 pb-24 md:mx-auto md:w-full md:max-w-3xl md:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Apps</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Pilih fitur untuk mendukung operasional tim Anda.</p>
                </div>

                {isAdmin && (
                    <Link href="/apps/settings" className="mb-4 block">
                        <Card className="border border-primary/30 bg-primary/10 shadow-sm transition-all hover:bg-primary/15">
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <AppIcon 
                                        icon={Settings2} 
                                        iconBg="bg-card shadow-sm border border-primary/30"
                                        iconColor="text-primary"
                                        size="sm" 
                                    />
                                    <div>
                                        <p className="font-semibold text-foreground">Apps Settings</p>
                                        <p className="text-xs text-muted-foreground">Atur visibilitas app per role (sementara placeholder)</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-primary" />
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
                        } else if (feature.id === "event-calendar") {
                            featureHref = "/apps/event-calendar"
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
                                                <AppIcon 
                                                    icon={Icon} 
                                                    iconBg={feature.iconBg} 
                                                    iconColor={feature.iconColor} 
                                                    size="md" 
                                                />
                                                <div>
                                                    <p className="font-semibold text-foreground">{feature.title}</p>
                                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
                                            <AppIcon 
                                                icon={Icon} 
                                                iconBg={feature.iconBg} 
                                                iconColor={feature.iconColor} 
                                                size="md" 
                                            />
                                            <div>
                                                <p className="font-semibold text-foreground">{feature.title}</p>
                                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                                            </div>
                                        </div>
                                        <div className="ml-3 flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
                    <Card className="w-full max-w-sm border-none shadow-xl">
                        <CardContent className="p-6 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
                                <Wrench className="h-7 w-7 text-warning" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Coming Soon</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Fitur <span className="font-semibold text-foreground">{comingSoonFeature.title}</span> sedang dalam proses pengembangan.
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
