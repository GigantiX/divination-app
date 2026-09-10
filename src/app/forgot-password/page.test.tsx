import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestPasswordResetAction } from '@/app/actions/password-reset'
import ForgotPasswordPage from './page'

vi.mock('@/app/actions/password-reset', () => ({
    requestPasswordResetAction: vi.fn(),
}))

describe('ForgotPasswordPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders an email reset form', () => {
        render(<ForgotPasswordPage />)

        expect(screen.getByRole('heading', { name: 'Lupa kata sandi?' })).toBeInTheDocument()
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Kirim tautan reset' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Kembali ke halaman masuk/ })).toHaveAttribute(
            'href',
            '/login'
        )
    })

    it('shows the generic success message after submission', async () => {
        let resolveRequest: (value: { status: 'success'; message: string }) => void = () => {}
        vi.mocked(requestPasswordResetAction).mockImplementationOnce(
            () => new Promise((resolve) => { resolveRequest = resolve })
        )
        render(<ForgotPasswordPage />)

        await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
        await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan reset' }))

        expect(screen.getByRole('button', { name: 'Mengirim...' })).toBeDisabled()

        await act(async () => {
            resolveRequest({
                status: 'success',
                message: 'Jika email tersebut terdaftar, tautan telah dikirim.',
            })
        })

        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('Jika email tersebut terdaftar')
        })
    })
})
