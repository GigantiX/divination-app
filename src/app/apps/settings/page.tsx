import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft, Sparkles, ShieldCheck } from "lucide-react"

import { getProfile } from "@/app/actions/profile"
import { NavigationLayout } from "@/components/ui/nav-layout"
import { Card, CardContent } from "@/components/ui/card"

export default async function AppsSettingsPage() {
    const profile = await getProfile()

    if (!profile) {
        redirect('/login')
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'developer'
    if (!isAdmin) {
        redirect('/apps')
    }

    return (
        <NavigationLayout isAdmin>
            <div className="flex-1 p-4 pb-24 md:mx-auto md:w-full md:max-w-3xl md:p-6">
                <div className="mb-6 flex items-center gap-2">
                    <Link
                        href="/apps"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Apps Settings</h1>
                        <p className="text-sm text-muted-foreground">Kelola visibilitas fitur untuk tiap role app.</p>
                    </div>
                </div>

                <Card className="border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="mb-4 flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">App-level role settings</p>
                                <p className="text-sm text-muted-foreground">
                                    Halaman ini disiapkan untuk pengaturan visibilitas fitur berdasarkan role di masa mendatang.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/15 p-4">
                            <p className="flex items-center gap-2 text-sm font-medium text-primary">
                                <Sparkles className="h-4 w-4" /> Coming Soon
                            </p>
                            <p className="mt-1 text-sm text-primary">
                                Saat ini belum ada pengaturan yang dapat diubah. Struktur halaman sudah siap untuk implementasi berikutnya.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </NavigationLayout>
    )
}
