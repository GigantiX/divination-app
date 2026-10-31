import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConnectionEditor } from './connection-editor'
import { checkConnectedApp, saveConnectedApp } from '@/app/actions/connected-apps'
import type { CheckedConnection } from '@/lib/integrations/types'

vi.mock('@/app/actions/connected-apps', () => ({ checkConnectedApp: vi.fn(), saveConnectedApp: vi.fn() }))

const verified: CheckedConnection = {
    profile: { schema_version: 1, user_id: 'oo-user', owner_id: 'oo-user', name: 'Verified Owner', email: 'owner@example.com', username: 'verified-store', phone: null, role: 'owner', capabilities: [], is_active: true, package: 'premium', expired_date: null },
    receipt: 'signed-verification', expiresAt: Date.now() + 600000, sameAccountExists: false,
}
const onClose = vi.fn()
const onSaved = vi.fn()

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
    HTMLDialogElement.prototype.close = function () { this.open = false }
})
beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkConnectedApp).mockResolvedValue({ success: true, data: { ...verified, expiresAt: Date.now() + 600000 } })
})
afterEach(() => cleanup())

function filledForm() {
    render(<ConnectionEditor onClose={onClose} onSaved={onSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'OrderOnline' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Store One' } })
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'test-pat-key' } })
}

describe('API key connection form', () => {
    it('disables upcoming providers and gates Check on both required fields', () => {
        render(<ConnectionEditor onClose={onClose} onSaved={onSaved} />)
        for (const name of [/Berdu/, /Scalev/, /Sejoli/]) expect(screen.getByRole('button', { name })).toBeDisabled()
        expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'OrderOnline' }))
        expect(screen.getByRole('button', { name: 'Check Connection' })).toBeDisabled()
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Store' } })
        expect(screen.getByRole('button', { name: 'Check Connection' })).toBeDisabled()
        fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'key' } })
        expect(screen.getByRole('button', { name: 'Check Connection' })).toBeEnabled()
        expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password')
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('shows the verified profile before enabling Save and submits the receipt', async () => {
        vi.mocked(saveConnectedApp).mockResolvedValue({ success: true, data: {} } as never)
        filledForm()
        fireEvent.click(screen.getByRole('button', { name: 'Check Connection' }))
        await screen.findByText('Verified Owner')
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))
        await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
        expect(saveConnectedApp).toHaveBeenCalledWith({ provider: 'orderonline', name: 'Store One', apiKey: 'test-pat-key', receipt: 'signed-verification' })
        expect(screen.getByLabelText('API Key')).toHaveValue('')
    })

    it('invalidates the preview when the key changes but allows a label-only edit', async () => {
        filledForm()
        fireEvent.click(screen.getByRole('button', { name: 'Check Connection' }))
        await screen.findByText('Verified Owner')
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } })
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
        fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'different-key' } })
        expect(screen.queryByText('Verified Owner')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('keeps Save disabled on verification failure and shows the error', async () => {
        vi.mocked(checkConnectedApp).mockResolvedValue({ success: false, code: 'invalid_credentials', error: 'API key tidak valid.' })
        filledForm()
        fireEvent.click(screen.getByRole('button', { name: 'Check Connection' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('API key tidak valid.')
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
        expect(saveConnectedApp).not.toHaveBeenCalled()
    })

    it('retains a verified draft for retry when database saving fails', async () => {
        vi.mocked(saveConnectedApp).mockResolvedValue({ success: false, code: 'database', error: 'Coba lagi.' })
        filledForm()
        fireEvent.click(screen.getByRole('button', { name: 'Check Connection' }))
        await screen.findByText('Verified Owner')
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('Coba lagi.')
        expect(screen.getByLabelText('API Key')).toHaveValue('test-pat-key')
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
        expect(onSaved).not.toHaveBeenCalled()
    })

    it('warns about another connection to the same account without disabling Save', async () => {
        vi.mocked(checkConnectedApp).mockResolvedValue({ success: true, data: { ...verified, expiresAt: Date.now() + 600000, sameAccountExists: true } })
        filledForm()
        fireEvent.click(screen.getByRole('button', { name: 'Check Connection' }))
        expect(await screen.findByText(/Akun ini sudah memiliki koneksi/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    })

    it('canceling never persists the draft', () => {
        filledForm()
        fireEvent.click(screen.getByRole('button', { name: 'Batal' }))
        expect(onClose).toHaveBeenCalledOnce()
        expect(saveConnectedApp).not.toHaveBeenCalled()
    })
})
