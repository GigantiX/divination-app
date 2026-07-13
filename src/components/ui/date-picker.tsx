"use client"

import * as React from "react"
import { DayPicker, type DateRange } from "react-day-picker"
import { id } from "date-fns/locale"
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatePickerSingleProps {
    mode: "single"
    selected?: Date
    onSelect: (date: Date | undefined) => void
    min?: Date
    max?: Date
    placeholder?: string
    className?: string
    disabled?: boolean
}

interface DatePickerRangeProps {
    mode: "range"
    selected?: DateRange
    onSelect: (range: DateRange | undefined) => void
    min?: Date
    max?: Date
    placeholder?: string
    className?: string
    disabled?: boolean
}

type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSingle(date: Date | undefined, placeholder: string) {
    if (!date) return placeholder
    return format(date, "d MMM yyyy", { locale: id })
}

function formatRange(range: DateRange | undefined, placeholder: string) {
    if (!range?.from) return placeholder
    if (!range.to) return format(range.from, "d MMM yyyy", { locale: id }) + " →"
    return (
        format(range.from, "d MMM yyyy", { locale: id }) +
        " – " +
        format(range.to, "d MMM yyyy", { locale: id })
    )
}

// ─── DayPicker classNames (Tailwind, v9 key names) ────────────────────────────

const dpClassNames = {
    root: "w-full select-none",
    months: "flex flex-col",
    month: "space-y-2",
    month_caption:
        "relative flex h-9 items-center justify-center px-10",
    caption_label: "text-sm font-bold text-gray-900",
    nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between px-1",
    button_previous:
        "flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none",
    button_next:
        "flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none",
    month_grid: "w-full border-collapse",
    weekdays: "grid grid-cols-7 mb-1",
    weekday:
        "text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 py-1",
    weeks: "space-y-1",
    week: "grid grid-cols-7",
    // Day cell — also receives range_start / range_end / range_middle / selected / today / outside / disabled
    day: "relative flex items-center justify-center p-0 text-sm",
    day_button:
        "h-9 w-9 flex items-center justify-center rounded-full font-medium text-gray-800 transition-colors hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1",
    // State classes applied to the `day` cell
    selected:
        "[&>button]:!bg-violet-600 [&>button]:!text-white [&>button]:hover:!bg-violet-700",
    today: "[&>button]:font-extrabold [&>button]:text-violet-600",
    outside: "[&>button]:text-gray-300 [&>button]:hover:bg-transparent pointer-events-none",
    disabled: "[&>button]:opacity-30 pointer-events-none",
    focused: "",
    hidden: "invisible pointer-events-none",
    // Range states — applied to the `day` cell
    range_start:
        "rounded-l-full bg-violet-100 [&>button]:!bg-violet-600 [&>button]:!text-white [&>button]:hover:!bg-violet-700",
    range_end:
        "rounded-r-full bg-violet-100 [&>button]:!bg-violet-600 [&>button]:!text-white [&>button]:hover:!bg-violet-700",
    range_middle:
        "bg-violet-100 rounded-none [&>button]:bg-transparent [&>button]:!text-violet-700 [&>button]:hover:bg-violet-200",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DatePicker(props: DatePickerProps) {
    const { mode, selected, min, max, placeholder = "Pilih tanggal", className, disabled } = props
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Close on outside click
    React.useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [open])

    const disabledMatcher = React.useCallback(
        (date: Date) => {
            if (max && date > max) return true
            if (min && date < min) return true
            return false
        },
        [min, max]
    )

    const displayText =
        mode === "single"
            ? formatSingle(selected as Date | undefined, placeholder)
            : formatRange(selected as DateRange | undefined, placeholder)

    const hasValue =
        mode === "single"
            ? !!(selected as Date | undefined)
            : !!(selected as DateRange | undefined)?.from

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            {/* Trigger */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "flex h-11 w-full items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium transition-all",
                    "hover:border-gray-300 hover:bg-gray-100",
                    "focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1",
                    open && "border-violet-400 ring-2 ring-violet-200",
                    !hasValue && "text-gray-400",
                    hasValue && "text-gray-900",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="flex-1 text-left truncate">{displayText}</span>
            </button>

            {/* Calendar Dropdown */}
            {open && (
                <div
                    className={cn(
                        "absolute left-0 top-full z-50 mt-2 min-w-[280px]",
                        "rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl",
                        "animate-in fade-in zoom-in-95 duration-150"
                    )}
                >
                    {mode === "single" ? (
                        <DayPicker
                            mode="single"
                            selected={selected as Date | undefined}
                            onSelect={(date) => {
                                ;(props as DatePickerSingleProps).onSelect(date)
                                setOpen(false)
                            }}
                            disabled={disabledMatcher}
                            locale={id}
                            classNames={dpClassNames}
                            components={{
                                Chevron: ({ orientation }) =>
                                    orientation === "left" ? (
                                        <ChevronLeft className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    ),
                            }}
                        />
                    ) : (
                        <DayPicker
                            mode="range"
                            selected={selected as DateRange | undefined}
                            onSelect={(range) => {
                                ;(props as DatePickerRangeProps).onSelect(range)
                                // Close after full range is picked
                                if (range?.from && range?.to) {
                                    setTimeout(() => setOpen(false), 250)
                                }
                            }}
                            disabled={disabledMatcher}
                            locale={id}
                            classNames={dpClassNames}
                            components={{
                                Chevron: ({ orientation }) =>
                                    orientation === "left" ? (
                                        <ChevronLeft className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    ),
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
