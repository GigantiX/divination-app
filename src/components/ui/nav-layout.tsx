"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { BottomNav } from "./bottom-nav"

interface NavigationLayoutProps {
    children: React.ReactNode
    isAdmin?: boolean
}

export function NavigationLayout({ children, isAdmin = false }: NavigationLayoutProps) {
    return (
        <div className="flex min-h-screen bg-background-secondary">
            {/* Desktop Sidebar */}
            <Sidebar isAdmin={isAdmin} />

            {/* Main Content Area */}
            {/* Using md:pl-64 to push content right when Sidebar is visible */}
            {/* Using pb-16 to add padding for the BottomNav on mobile */}
            <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 md:pl-64 transition-all duration-300">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav isAdmin={isAdmin} />
        </div>
    )
}
