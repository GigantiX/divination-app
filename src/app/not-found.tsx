import Link from "next/link"
import { Home, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background-secondary p-6">
            <div className="w-full max-w-sm text-center">
                <div className="mb-6">
                    <span className="text-7xl font-bold text-muted-foreground/30">404</span>
                </div>
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                    <Search className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-foreground">
                    Halaman Tidak Ditemukan
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">
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
