import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetPasswordAction } from '@/app/actions/password-reset'
import { ResetPasswordForm } from './reset-password-form'

vi.mock('@/app/actions/password-reset', () => ({
    resetPasswordAction: vi.fn(),
}))

describe('ResetPasswordForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('shows an invalid-link state when the token is missing', () => {
        render(<ResetPasswordForm token="" />)

        expect(screen.getByRole('alert')).toHaveTextContent('Tautan reset tidak lengkap')
        expect(screen.getByRole('link', { name: 'Minta tautan baru' })).toHaveAttribute(
            'href',
            '/forgot-password'
        )
    })

    it('renders password fields for a valid token', () => {
        render(<ResetPasswordForm token={'a'.repeat(43)} />)

        expect(screen.getByLabelText('Kata sandi baru')).toHaveAttribute('type', 'password')
        expect(screen.getByLabelText('Konfirmasi kata sandi')).toHaveAttribute('type', 'password')
        expect(screen.getByRole('button', { name: 'Perbarui kata sandi' })).toBeInTheDocument()
    })

    it('toggles password visibility', async () => {
        render(<ResetPasswordForm token={'a'.repeat(43)} />)

        const password = screen.getByLabelText('Kata sandi baru')
        await userEvent.click(screen.getByRole('button', { name: 'Tampilkan kata sandi' }))

        expect(password).toHaveAttribute('type', 'text')
    })

    it('shows success after resetting the password', async () => {
        let resolveReset: (value: { status: 'success'; message: string }) => void = () => {}
        vi.mocked(resetPasswordAction).mockImplementationOnce(
            () => new Promise((resolve) => { resolveReset = resolve })
        )
        render(<ResetPasswordForm token={'a'.repeat(43)} />)

        await userEvent.type(screen.getByLabelText('Kata sandi baru'), 'new-password')
        await userEvent.type(screen.getByLabelText('Konfirmasi kata sandi'), 'new-password')
        await userEvent.click(screen.getByRole('button', { name: 'Perbarui kata sandi' }))

        await act(async () => {
            resolveReset({ status: 'success', message: 'Kata sandi berhasil diperbarui.' })
        })

        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent('Kata sandi berhasil diperbarui')
        })
        expect(screen.getByRole('link', { name: 'Masuk dengan kata sandi baru' })).toHaveAttribute(
            'href',
            '/login'
        )
    })
})
