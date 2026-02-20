export default function DashboardLoading() {
    return (
        <div className="flex min-h-screen flex-col bg-background-secondary">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                </div>
            </div>

            <div className="flex-1 p-6">
                {/* Welcome skeleton */}
                <div className="mb-8 space-y-2">
                    <div className="h-7 w-48 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-200" />
                    <div className="mt-2 h-6 w-20 animate-pulse rounded-full bg-gray-200" />
                </div>

                {/* Section header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="h-5 w-28 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-4 w-16 animate-pulse rounded-lg bg-gray-200" />
                </div>

                {/* Event cards */}
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded-lg bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
