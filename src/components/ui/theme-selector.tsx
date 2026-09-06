"use client"

import * as React from "react"
import { Laptop, Moon, Sun } from "lucide-react"

import { type ThemePreference, useTheme } from "@/components/theme-provider"
import { updateThemePreference } from "@/app/actions/profile"
import { cn } from "@/lib/utils"

const options: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
    { value: "light", label: "Terang", Icon: Sun },
    { value: "dark", label: "Gelap", Icon: Moon },
    { value: "system", label: "Sistem", Icon: Laptop },
]

export function ThemeSelector() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const [saveError, setSaveError] = React.useState<string | null>(null)
    const [isSaving, startTransition] = React.useTransition()

    React.useEffect(() => setMounted(true), [])

    const selectTheme = (nextTheme: ThemePreference) => {
        if (nextTheme === theme) return

        const previousTheme = theme
        setSaveError(null)
        setTheme(nextTheme)

        startTransition(async () => {
            try {
                const result = await updateThemePreference(nextTheme)
                if (!result.error) return

                setTheme(previousTheme)
                setSaveError(result.error)
            } catch {
                setTheme(previousTheme)
                setSaveError("Gagal menyimpan tema")
            }
        })
    }

    return (
        <div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Pilih tampilan" aria-busy={isSaving}>
                {options.map(({ value, label, Icon }) => {
                    const active = mounted && theme === value
                    return (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => selectTheme(value)}
                            disabled={isSaving}
                            className={cn(
                                "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                                active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                            {label}
                        </button>
                    )
                })}
            </div>
            {saveError && <p className="mt-2 text-sm text-destructive" role="alert">{saveError}</p>}
        </div>
    )
}
