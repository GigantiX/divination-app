import { useState } from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { BatchSessionSelect } from "./batch-session-select"

const sessions = [
    { id: "jakarta", name: "Jakarta" },
    { id: "bandung", name: "Bandung" },
]

function SessionForm() {
    const [value, setValue] = useState("")

    return (
        <form>
            <BatchSessionSelect sessions={sessions} value={value} onChange={setValue} />
        </form>
    )
}

describe("BatchSessionSelect", () => {
    it("renders required radio chips and allows only one selected city/session", async () => {
        const user = userEvent.setup()
        render(<SessionForm />)

        const jakarta = screen.getByRole("radio", { name: "Jakarta" })
        const bandung = screen.getByRole("radio", { name: "Bandung" })

        expect(jakarta).toHaveAttribute("name", "batch-session")
        expect(jakarta).toBeRequired()
        expect(bandung).toBeRequired()
        expect(jakarta).not.toBeChecked()
        expect(bandung).not.toBeChecked()

        await user.click(screen.getByText("Jakarta"))
        expect(jakarta).toBeChecked()
        expect(bandung).not.toBeChecked()

        await user.click(screen.getByText("Bandung"))
        expect(jakarta).not.toBeChecked()
        expect(bandung).toBeChecked()
    })

    it("does not render a choice for batches without Kota/Sesi", () => {
        const { container } = render(<BatchSessionSelect sessions={[]} value="" onChange={() => {}} />)

        expect(container).toBeEmptyDOMElement()
    })

    it("disables all choices while saving", () => {
        render(<BatchSessionSelect sessions={sessions} value="jakarta" onChange={() => {}} disabled />)

        expect(screen.getByRole("radio", { name: "Jakarta" })).toBeDisabled()
        expect(screen.getByRole("radio", { name: "Bandung" })).toBeDisabled()
    })
})
