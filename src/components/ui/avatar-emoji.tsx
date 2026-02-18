"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarEmojiProps extends React.HTMLAttributes<HTMLDivElement> {
    emoji: string
    size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
    sm: "h-8 w-8 text-base",      // Small - for lists
    md: "h-10 w-10 text-lg",      // Medium - default
    lg: "h-16 w-16 text-2xl",     // Large - for cards
    xl: "h-24 w-24 text-4xl",     // Extra large - for profile
}

/**
 * AvatarEmoji - Display emoji in a circular avatar
 * Emoji is displayed at 50% size inside the circle
 */
const AvatarEmoji = React.forwardRef<HTMLDivElement, AvatarEmojiProps>(
    ({ emoji, size = "md", className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-blue-200",
                sizeClasses[size],
                className
            )}
            {...props}
        >
            <span className="select-none" role="img" aria-label="avatar">
                {emoji || "😀"}
            </span>
        </div>
    )
)
AvatarEmoji.displayName = "AvatarEmoji"

export { AvatarEmoji }
