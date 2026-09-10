import { Card, CardContent } from "@/components/ui/card"

export default function BatchListLoading() {
    return (
        <div className="min-h-screen bg-background-secondary pb-20 md:pl-64 md:pb-0">
            <div className="sticky top-0 z-10 h-[73px] animate-pulse border-b bg-card" />
            <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
                <div className="space-y-3">
                    <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
                    <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
                </div>
                {[0, 1].map((section) => (
                    <section key={section} className="space-y-4">
                        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                        {[0, 1].map((card) => (
                            <Card key={card} className="overflow-hidden border-border/80">
                                <CardContent className="space-y-5 p-5 sm:p-6">
                                    <div className="flex justify-between gap-4">
                                        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                                        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {[0, 1, 2].map((item) => (
                                            <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    )
}
