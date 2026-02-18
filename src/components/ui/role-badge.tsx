"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RoleBadgeProps {
    role: "developer" | "admin" | "user"
    className?: string
}

const roleConfig = {
    developer: {
        label: "DEVELOPER",
        bgColor: "bg-gradient-to-r from-purple-500 to-indigo-500",
        textColor: "text-white",
        shadow: "shadow-purple-500/30",
    },
    admin: {
        label: "ADMIN",
        bgColor: "bg-gradient-to-r from-blue-500 to-cyan-500",
        textColor: "text-white",
        shadow: "shadow-blue-500/30",
    },
    user: {
        label: "USER",
        bgColor: "bg-gradient-to-r from-emerald-500 to-teal-500",
        textColor: "text-white",
        shadow: "shadow-emerald-500/30",
    },
}

/**
 * RoleBadge - Modern badge to display user role
 * Features: gradient background, shadow, uppercase text
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
    const config = roleConfig[role] || roleConfig.user

    return (
        <span
            className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-lg",
                config.bgColor,
                config.textColor,
                config.shadow,
                className
            )}
        >
            {config.label}
        </span>
    )
}
