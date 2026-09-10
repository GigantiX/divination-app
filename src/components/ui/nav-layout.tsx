"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { BottomNav } from "./bottom-nav"

interface NavigationLayoutProps {
    children: React.ReactNode
    isAdmin?: boolean
    showBottomNav?: boolean
}

export function NavigationLayout({
    children,
    isAdmin = false,
    showBottomNav = true,
}: NavigationLayoutProps) {
    return (
        <div className="flex min-h-screen bg-background-secondary text-foreground">
            {/* Desktop Sidebar */}
            <Sidebar isAdmin={isAdmin} />

            {/* Main Content Area */}
            {/* Using md:pl-64 to push content right when Sidebar is visible */}
            <main className={`flex min-w-0 flex-1 flex-col transition-all duration-300 md:pb-0 md:pl-64 ${showBottomNav ? "pb-20" : "pb-0"}`}>
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            {showBottomNav ? <BottomNav isAdmin={isAdmin} /> : null}
        </div>
    )
}
