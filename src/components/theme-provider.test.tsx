import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("@/app/actions/profile", () => ({
    updateThemePreference: vi.fn().mockResolvedValue({ success: true }),
}))

import { ThemeProvider, useTheme } from "./theme-provider"
import { ThemeSelector } from "./ui/theme-selector"

function ThemeState() {
    const { theme, resolvedTheme } = useTheme()
    return <output>{`${theme}:${resolvedTheme}`}</output>
}

describe("theme system", () => {
    beforeEach(() => {
        window.localStorage.clear()
        document.documentElement.classList.remove("dark")
        document.documentElement.style.colorScheme = ""
    })

    it("uses a persisted dark preference and updates the document color scheme", async () => {
        window.localStorage.setItem("divination-theme", "dark")

        render(
            <ThemeProvider>
                <ThemeState />
            </ThemeProvider>
        )

        await waitFor(() => {
            expect(document.documentElement).toHaveClass("dark")
            expect(document.documentElement.style.colorScheme).toBe("dark")
            expect(screen.getByText("dark:dark")).toBeInTheDocument()
        })
    })

    it("uses the system preference when no explicit selection exists", async () => {
        render(
            <ThemeProvider>
                <ThemeState />
            </ThemeProvider>
        )

        await waitFor(() => {
            expect(document.documentElement).not.toHaveClass("dark")
            expect(screen.getByText("system:light")).toBeInTheDocument()
        })
    })

    it("uses the authenticated preference instead of a stale browser cache", async () => {
        window.localStorage.setItem("divination-theme", "dark")

        render(
            <ThemeProvider defaultTheme="light" useStorageFallback={false}>
                <ThemeState />
            </ThemeProvider>
        )

        await waitFor(() => {
            expect(document.documentElement).not.toHaveClass("dark")
            expect(screen.getByText("light:light")).toBeInTheDocument()
        })
    })

    it("switches from the Settings selector and persists the choice", async () => {
        const user = userEvent.setup()

        render(
            <ThemeProvider>
                <ThemeSelector />
            </ThemeProvider>
        )

        await user.click(screen.getByRole("button", { name: "Gelap" }))

        await waitFor(() => {
            expect(document.documentElement).toHaveClass("dark")
            expect(window.localStorage.getItem("divination-theme")).toBe("dark")
            expect(screen.getByRole("button", { name: "Gelap" })).toHaveAttribute("aria-pressed", "true")
        })
    })
})
