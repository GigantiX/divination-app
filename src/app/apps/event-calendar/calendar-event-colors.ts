export type CalendarEventColor = {
    chip: string
    dot: string
    surface: string
    rail: string
}

const EVENT_COLORS: CalendarEventColor[] = [
    {
        chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
        surface: "bg-emerald-500/10",
        rail: "border-l-emerald-500",
    },
    {
        chip: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        dot: "bg-sky-500",
        surface: "bg-sky-500/10",
        rail: "border-l-sky-500",
    },
    {
        chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
        surface: "bg-amber-500/10",
        rail: "border-l-amber-500",
    },
    {
        chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        dot: "bg-rose-500",
        surface: "bg-rose-500/10",
        rail: "border-l-rose-500",
    },
    {
        chip: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        dot: "bg-violet-500",
        surface: "bg-violet-500/10",
        rail: "border-l-violet-500",
    },
    {
        chip: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
        dot: "bg-cyan-500",
        surface: "bg-cyan-500/10",
        rail: "border-l-cyan-500",
    },
]

function hashEventId(eventId: string): number {
    let hash = 0
    for (let index = 0; index < eventId.length; index += 1) {
        hash = (hash * 31 + eventId.charCodeAt(index)) | 0
    }
    return Math.abs(hash)
}

export function getCalendarEventColor(eventId: string): CalendarEventColor {
    return EVENT_COLORS[hashEventId(eventId) % EVENT_COLORS.length]
}
