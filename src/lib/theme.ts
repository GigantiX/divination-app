export const THEME_PREFERENCES = ["light", "dark", "system"] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const DEFAULT_THEME: ThemePreference = "system"

export function isThemePreference(value: unknown): value is ThemePreference {
    return typeof value === "string" && THEME_PREFERENCES.includes(value as ThemePreference)
}
