"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Settings, Grid3X3, WalletCards, Database, Calendar } from "lucide-react"
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
        { 
            href: "/apps", 
            icon: Grid3X3, 
            label: "Apps",
            subItems: [
                { href: "/apps/request-budget", icon: WalletCards, label: "Request Budget" },
                { href: "/apps/lead-database", icon: Database, label: "Lead Database" },
                { href: "/apps/event-calendar", icon: Calendar, label: "Event Calendar" }
            ]
        },
        ...(isAdmin ? [{ href: "/people", icon: Users, label: "Orang" }] : []),
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
                        <div key={item.label} className="space-y-1">
                            <Link
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
                            {item.subItems && (
                                <div className="ml-4 pl-4 border-l border-gray-100 space-y-1 mt-1">
                                    {item.subItems.map((subItem) => {
                                        const SubIcon = subItem.icon;
                                        return (
                                            <Link
                                                key={subItem.label}
                                                href={subItem.href}
                                                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                            >
                                                <SubIcon className="h-4 w-4 text-gray-400" />
                                                <span>{subItem.label}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-gray-100 space-y-4">
                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive("/settings")
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}
                >
                    <Settings className={cn("h-5 w-5", isActive("/settings") ? "text-primary" : "text-gray-400")} />
                    <span>Pengaturan</span>
                </Link>
                <p className="text-xs text-center text-gray-400">
                    &copy; 2026 Divination Dashboard
                </p>
            </div>
        </aside>
    )
}
