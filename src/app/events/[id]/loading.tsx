export default function EventDetailLoading() {
    return (
        <div className="flex min-h-screen flex-col bg-background-secondary pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-5 w-40 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
                </div>

                {/* Batch selector skeleton */}
                <div className="px-4 pb-4">
                    <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
                </div>

                {/* Tabs skeleton */}
                <div className="flex border-b px-4">
                    <div className="flex flex-1 justify-center py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                    </div>
                    <div className="flex flex-1 justify-center py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-6 p-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-32 animate-pulse rounded-2xl bg-white shadow-sm"
                        />
                    ))}
                </div>

                {/* Chart skeleton */}
                <div className="h-52 animate-pulse rounded-2xl bg-white shadow-sm" />

                {/* Advertiser list skeleton */}
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-xl bg-white shadow-sm"
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
