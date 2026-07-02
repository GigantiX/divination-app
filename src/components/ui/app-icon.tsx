"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AppIconProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: React.ComponentType<{ className?: string }>
    iconColor?: string
    iconBg?: string
    size?: "sm" | "md" | "lg"
}

export function AppIcon({ 
    icon: Icon, 
    iconColor = "text-primary", 
    iconBg = "bg-primary/10", 
    size = "md",
    className,
    ...props 
}: AppIconProps) {
    const sizeClasses = {
        sm: "h-10 w-10 rounded-lg",
        md: "h-12 w-12 rounded-xl",
        lg: "h-14 w-14 rounded-2xl",
    }

    const iconSizes = {
        sm: "h-5 w-5",
        md: "h-6 w-6",
        lg: "h-7 w-7",
    }

    return (
        <div 
            className={cn(
                "flex items-center justify-center shrink-0 transition-all",
                sizeClasses[size],
                iconBg,
                className
            )}
            {...props}
        >
            <Icon className={cn(iconSizes[size], iconColor)} />
        </div>
    )
}
