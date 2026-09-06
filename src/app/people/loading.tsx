export default function PeopleLoading() {
    return (
        <div className="flex min-h-screen flex-col bg-muted pb-20">
            {/* Header */}
            <div className="bg-card px-4 py-4 shadow-sm">
                <div className="h-7 w-24 animate-pulse rounded-lg bg-muted-foreground/20" />
            </div>

            <div className="flex-1 p-4 md:max-w-2xl md:mx-auto md:w-full">
                {/* Search bar skeleton */}
                <div className="mb-6 h-12 animate-pulse rounded-xl bg-card shadow-sm" />

                {/* Section header skeleton */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="h-5 w-32 animate-pulse rounded-lg bg-muted-foreground/20" />
                    <div className="h-4 w-20 animate-pulse rounded-lg bg-muted-foreground/20" />
                </div>

                {/* Person cards skeleton */}
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="rounded-xl bg-card p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-muted-foreground/20" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted-foreground/20" />
                                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted-foreground/20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
