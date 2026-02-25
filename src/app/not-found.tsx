import Link from "next/link"
import { Home, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background-secondary p-6">
            <div className="w-full max-w-sm text-center">
                <div className="mb-6">
                    <span className="text-7xl font-bold text-gray-200">404</span>
                </div>
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <Search className="h-8 w-8 text-blue-500" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                    Halaman Tidak Ditemukan
                </h2>
                <p className="mb-6 text-sm text-gray-500">
                    Halaman yang Anda cari tidak ada atau telah dipindahkan.
                </p>
                <Link href="/dashboard">
                    <Button className="w-full h-11">
                        <Home className="mr-2 h-4 w-4" />
                        Kembali ke Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    )
}
