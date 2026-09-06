"use client"

import * as React from "react"
import { DEFAULT_THEME, isThemePreference, type ThemePreference } from "@/lib/theme"

export type { ThemePreference } from "@/lib/theme"

const STORAGE_KEY = "divination-theme"

type ThemeContextValue = {
    theme: ThemePreference
    resolvedTheme: "light" | "dark"
    setTheme: (theme: ThemePreference) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function resolveTheme(theme: ThemePreference) {
    return theme === "system" ? getSystemTheme() : theme
}

function applyTheme(theme: ThemePreference) {
    const resolvedTheme = resolveTheme(theme)
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
    root.style.colorScheme = resolvedTheme
    return resolvedTheme
}

interface ThemeProviderProps {
    children: React.ReactNode
    defaultTheme?: ThemePreference
    useStorageFallback?: boolean
}

export function ThemeProvider({
    children,
    defaultTheme = DEFAULT_THEME,
    useStorageFallback = true,
}: ThemeProviderProps) {
    const [theme, setThemeState] = React.useState<ThemePreference>(() => {
        if (typeof window === "undefined" || !useStorageFallback) return defaultTheme

        const storedTheme = window.localStorage.getItem(STORAGE_KEY)
        return isThemePreference(storedTheme) ? storedTheme : defaultTheme
    })
    const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")

    React.useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const updateTheme = () => setResolvedTheme(applyTheme(theme))

        updateTheme()
        if (theme === "system") {
            mediaQuery.addEventListener("change", updateTheme)
            return () => mediaQuery.removeEventListener("change", updateTheme)
        }
    }, [theme])

    const setTheme = React.useCallback((nextTheme: ThemePreference) => {
        window.localStorage.setItem(STORAGE_KEY, nextTheme)
        setThemeState(nextTheme)
    }, [])

    const value = React.useMemo(
        () => ({ theme, resolvedTheme, setTheme }),
        [resolvedTheme, setTheme, theme]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const context = React.useContext(ThemeContext)
    if (!context) throw new Error("useTheme must be used inside ThemeProvider")
    return context
}

/** Applies a persisted preference before the first paint to prevent a theme flash. */
interface ThemeScriptProps {
    defaultTheme?: ThemePreference
    useStorageFallback?: boolean
}

export function ThemeScript({
    defaultTheme = DEFAULT_THEME,
    useStorageFallback = true,
}: ThemeScriptProps) {
    const script = `
      (function () {
        try {
          var key = "${STORAGE_KEY}";
          var stored = localStorage.getItem(key);
          var serverTheme = "${defaultTheme}";
          var preference = ${useStorageFallback ? 'stored === "light" || stored === "dark" || stored === "system" ? stored : serverTheme' : 'serverTheme'};
          var resolved = preference === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
          document.documentElement.classList.toggle("dark", resolved === "dark");
          document.documentElement.style.colorScheme = resolved;
        } catch (_) {}
      })();
    `

    return <script dangerouslySetInnerHTML={{ __html: script }} />
}
