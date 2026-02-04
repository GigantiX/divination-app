"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
    isAdmin?: boolean
}

export function BottomNav({ isAdmin = false }: BottomNavProps) {
    const pathname = usePathname()

    const isActive = (path: string) => {
        if (path === "/dashboard") {
            return pathname === "/dashboard" || pathname === "/"
        }
        return pathname.startsWith(path)
    }

    const navItems = [
        { href: "/dashboard", icon: Home, label: "Beranda" },
        ...(isAdmin ? [{ href: "/people", icon: Users, label: "Orang" }] : []),
        { href: "/settings", icon: Settings, label: "Pengaturan" },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white z-50">
            <nav className="flex items-center justify-around py-3 max-w-2xl mx-auto">
                {navItems.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 relative",
                                active ? "text-primary" : "text-gray-400"
                            )}
                        >
                            <Icon className="h-6 w-6" />
                            <span className="text-xs font-medium">{item.label}</span>
                            {active && (
                                <div className="absolute -bottom-3 w-12 h-1 bg-primary rounded-t-full" />
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
