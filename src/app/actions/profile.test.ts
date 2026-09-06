import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}))

import { auth } from "@/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { MockQueryBuilder, mockSupabaseClient } from "@/tests/mocks/supabase"
import { revalidatePath } from "next/cache"
import { getThemePreference, updateThemePreference } from "./profile"

describe("theme profile actions", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never)
        vi.mocked(createAdminClient).mockReturnValue(mockSupabaseClient as never)
    })

    it("reads a valid Supabase preference for the authenticated user", async () => {
        const query = new MockQueryBuilder({ theme: "dark" })
        vi.mocked(mockSupabaseClient.from).mockReturnValue(query as never)

        await expect(getThemePreference()).resolves.toBe("dark")
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles")
        expect(query.select).toHaveBeenCalledWith("theme")
        expect(query.eq).toHaveBeenCalledWith("id", "user-1")
    })

    it("uses the safe browser fallback when no profile row exists", async () => {
        vi.mocked(mockSupabaseClient.from).mockReturnValue(new MockQueryBuilder(null) as never)

        await expect(getThemePreference()).resolves.toBeNull()
    })

    it("updates only the authenticated user's preference and invalidates the layout", async () => {
        const query = new MockQueryBuilder()
        vi.mocked(mockSupabaseClient.from).mockReturnValue(query as never)

        await expect(updateThemePreference("system")).resolves.toEqual({ success: true })
        expect(query.update).toHaveBeenCalledWith({ theme: "system" })
        expect(query.eq).toHaveBeenCalledWith("id", "user-1")
        expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
    })

    it("rejects an invalid preference before accessing Supabase", async () => {
        await expect(updateThemePreference("midnight" as never)).resolves.toEqual({ error: "Tema tidak valid" })
        expect(auth).not.toHaveBeenCalled()
        expect(createAdminClient).not.toHaveBeenCalled()
    })
})
