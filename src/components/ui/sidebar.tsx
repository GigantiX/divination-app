"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Settings, Grid3X3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
    isAdmin?: boolean
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
    const pathname = usePathname()

    const isActive = (path: string) => {
        if (path === "/dashboard") {
            return pathname === "/dashboard" || pathname === "/"
        }
        return pathname.startsWith(path)
    }

    const navItems = [
        { href: "/dashboard", icon: Home, label: "Beranda" },
        { href: "/apps", icon: Grid3X3, label: "Apps" },
        ...(isAdmin ? [{ href: "/people", icon: Users, label: "Orang" }] : []),
        { href: "/settings", icon: Settings, label: "Pengaturan" },
    ]

    return (
        <aside className="hidden md:flex flex-col w-64 border-r bg-white fixed inset-y-0 left-0 z-50">
            <div className="p-6 border-b">
                <h1 className="text-2xl font-bold text-black tracking-tight">DIVINATION</h1>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {navItems.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                active
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-gray-400")} />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <p className="text-xs text-center text-gray-400">
                    &copy; 2026 Divination Dashboard
                </p>
            </div>
        </aside>
    )
}
