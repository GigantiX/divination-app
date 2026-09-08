import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
    CalendarAccessDeniedDialog,
    CalendarDayEventsDialog,
} from "./calendar-day-events-dialog"

const eventGroup = {
    event: { id: "event-1", name: "Growth Summit", status: "active" as const },
    batches: [
        {
            id: "batch-1",
            name: "Early Bird",
            startDate: "2026-09-08",
            endDate: "2026-09-08",
            notes: null,
            canAccess: true,
            event: { id: "event-1", name: "Growth Summit", status: "active" as const },
        },
        {
            id: "batch-2",
            name: "General Admission",
            startDate: "2026-09-08",
            endDate: "2026-09-08",
            notes: null,
            canAccess: true,
            event: { id: "event-1", name: "Growth Summit", status: "active" as const },
        },
    ],
}

describe("CalendarDayEventsDialog", () => {
    it("groups multiple batches under one event and links an accessible dashboard", () => {
        render(
            <CalendarDayEventsDialog
                date={new Date(2026, 8, 8)}
                eventGroups={[eventGroup]}
                customEvents={[]}
                onClose={vi.fn()}
                onOpenCustomEvent={vi.fn()}
                onAccessDenied={vi.fn()}
            />
        )

        expect(screen.getAllByText("Growth Summit")).toHaveLength(1)
        expect(screen.getByText("2 batch berjalan pada tanggal ini")).toBeInTheDocument()
        expect(screen.getByText("Early Bird")).toBeInTheDocument()
        expect(screen.getByText("General Admission")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: /Lihat Dashboard Event/i })).toHaveAttribute("href", "/events/event-1")
    })

    it("opens the access-denied path instead of rendering a dashboard link", async () => {
        const user = userEvent.setup()
        const onAccessDenied = vi.fn()
        const restrictedGroup = {
            ...eventGroup,
            event: { ...eventGroup.event, id: "event-2", name: "Restricted Summit" },
            batches: eventGroup.batches.map((batch) => ({
                ...batch,
                canAccess: false,
                event: { ...batch.event, id: "event-2", name: "Restricted Summit" },
            })),
        }

        render(
            <CalendarDayEventsDialog
                date={new Date(2026, 8, 8)}
                eventGroups={[restrictedGroup]}
                customEvents={[]}
                onClose={vi.fn()}
                onOpenCustomEvent={vi.fn()}
                onAccessDenied={onAccessDenied}
            />
        )

        await user.click(screen.getByRole("button", { name: /Lihat Dashboard Event/i }))
        expect(onAccessDenied).toHaveBeenCalledWith("Restricted Summit")
        expect(screen.queryByRole("link", { name: /Lihat Dashboard Event/i })).not.toBeInTheDocument()
    })

    it("renders the centered access-denied message with the event name", () => {
        render(<CalendarAccessDeniedDialog eventName="Restricted Summit" onClose={vi.fn()} />)

        expect(screen.getByRole("alertdialog")).toBeInTheDocument()
        expect(screen.getByText("Restricted Summit")).toBeInTheDocument()
    })
})
