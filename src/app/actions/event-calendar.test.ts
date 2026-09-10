import { beforeEach, describe, expect, it, vi } from "vitest"

import { auth } from "@/auth"
import { MockQueryBuilder, mockSupabaseClient } from "@/tests/mocks/supabase"
import { getCalendarBatches } from "./event-calendar"

describe("calendar event visibility", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "user" } } as never)
    })

    it("shows event and batch names while withholding inaccessible batch notes", async () => {
        const batchesQuery = new MockQueryBuilder([
            {
                id: "batch-accessible",
                name: "Batch Public",
                start_date: "2026-09-01",
                end_date: "2026-09-10",
                notes: "Visible note",
                events: { id: "event-accessible", name: "Accessible Event", status: "active" },
            },
            {
                id: "batch-restricted",
                name: "Batch Restricted",
                start_date: "2026-09-01",
                end_date: "2026-09-10",
                notes: "Internal note",
                events: { id: "event-restricted", name: "Restricted Event", status: "upcoming" },
            },
        ])

        vi.mocked(mockSupabaseClient.from).mockImplementation((table) => {
            if (table === "profiles") return new MockQueryBuilder({ role: "user" })
            if (table === "event_assignments") return new MockQueryBuilder([{ event_id: "event-accessible" }])
            if (table === "batches") return batchesQuery
            return new MockQueryBuilder(null)
        })

        await expect(getCalendarBatches()).resolves.toEqual([
            expect.objectContaining({
                id: "batch-accessible",
                name: "Batch Public",
                notes: "Visible note",
                canAccess: true,
                event: expect.objectContaining({ name: "Accessible Event" }),
            }),
            expect.objectContaining({
                id: "batch-restricted",
                name: "Batch Restricted",
                notes: null,
                canAccess: false,
                event: expect.objectContaining({ name: "Restricted Event" }),
            }),
        ])
        expect(batchesQuery.in).not.toHaveBeenCalled()
    })
})
