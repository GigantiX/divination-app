import { expect, test } from "@playwright/test"

test.describe("Theme smoke", () => {
    test("renders login surfaces coherently in persisted dark mode on desktop and mobile", async ({ page }) => {
        await page.context().clearCookies()
        await page.addInitScript(() => localStorage.setItem("divination-theme", "dark"))

        await page.goto("/login")
        await expect(page.locator("input").first()).toBeVisible()
        await expect(page.locator("html")).toHaveClass(/dark/)

        const desktopColors = await page.evaluate(() => {
            const body = getComputedStyle(document.body).backgroundColor
            const card = getComputedStyle(document.querySelector("form")!.parentElement!).backgroundColor
            const input = getComputedStyle(document.querySelector("input")!).backgroundColor
            return { body, card, input }
        })

        expect(desktopColors.body).not.toBe("rgb(255, 255, 255)")
        expect(desktopColors.card).not.toBe(desktopColors.body)
        expect(desktopColors.input).not.toBe("rgb(255, 255, 255)")

        await page.setViewportSize({ width: 390, height: 844 })
        await page.reload()
        await expect(page.locator("html")).toHaveClass(/dark/)
        await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible()
    })

    test("uses the Settings selector to persist the signed-in user's preference", async ({ page }) => {
        await page.addInitScript(() => localStorage.removeItem("divination-theme"))
        await page.goto("/settings")
        await expect(page.getByRole("group", { name: "Pilih tampilan" })).toBeVisible()

        const wasDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"))
        const nextTheme = wasDark ? "Terang" : "Gelap"
        const expectDark = !wasDark

        await page.getByRole("button", { name: nextTheme }).click()
        await expect(page.locator("html")).toHaveClass(expectDark ? /dark/ : /^((?!dark).)*$/)
        await expect.poll(() => page.evaluate(() => localStorage.getItem("divination-theme"))).toBe(expectDark ? "dark" : "light")

        await page.reload()
        await expect(page.locator("html")).toHaveClass(expectDark ? /dark/ : /^((?!dark).)*$/)
    })
})
