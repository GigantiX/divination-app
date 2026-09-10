import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashPassword } from '@/lib/password'
import { sendPasswordResetEmail } from '@/lib/email/password-reset'
import { mockSupabaseClient, MockQueryBuilder } from '@/tests/mocks/supabase'
import { requestPasswordResetAction, resetPasswordAction } from './password-reset'

vi.mock('@/lib/password', () => ({
    hashPassword: vi.fn().mockResolvedValue('hashed-new-password'),
}))

vi.mock('@/lib/email/password-reset', () => ({
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

const initialState = { status: 'idle' as const, message: '' }

function createFormData(fields: Record<string, string>): FormData {
    const formData = new FormData()
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value))
    return formData
}

describe('password reset server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSupabaseClient.rpc.mockResolvedValue({ data: true, error: null })
        process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    })

    it('validates the email address before accessing the database', async () => {
        const result = await requestPasswordResetAction(
            initialState,
            createFormData({ email: 'not-an-email' })
        )

        expect(result).toEqual({ status: 'error', message: 'Masukkan alamat email yang valid.' })
        expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('returns the generic response when the account does not exist', async () => {
        mockSupabaseClient.from.mockReturnValueOnce(new MockQueryBuilder(null))

        const result = await requestPasswordResetAction(
            initialState,
            createFormData({ email: 'missing@example.com' })
        )

        expect(result.status).toBe('success')
        expect(result.message).toContain('Jika email tersebut terdaftar')
        expect(sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('creates and emails a reset link for an existing account', async () => {
        mockSupabaseClient.from
            .mockReturnValueOnce(
                new MockQueryBuilder({
                    id: 'user-id',
                    full_name: 'Test User',
                    username: 'test@example.com',
                })
            )
            .mockReturnValueOnce(new MockQueryBuilder(null))
            .mockReturnValueOnce(new MockQueryBuilder(null))
            .mockReturnValueOnce(new MockQueryBuilder(null))

        const result = await requestPasswordResetAction(
            initialState,
            createFormData({ email: 'TEST@example.com ' })
        )

        expect(result.status).toBe('success')
        expect(sendPasswordResetEmail).toHaveBeenCalledWith({
            to: 'test@example.com',
            recipientName: 'Test User',
            resetUrl: expect.stringMatching(
                /^http:\/\/localhost:3000\/reset-password\?token=[A-Za-z0-9_-]{43}$/
            ),
        })
    })

    it('does not send another email during the cooldown', async () => {
        mockSupabaseClient.from
            .mockReturnValueOnce(
                new MockQueryBuilder({
                    id: 'user-id',
                    full_name: 'Test User',
                    username: 'test@example.com',
                })
            )
            .mockReturnValueOnce(new MockQueryBuilder({ id: 'recent-token' }))

        const result = await requestPasswordResetAction(
            initialState,
            createFormData({ email: 'test@example.com' })
        )

        expect(result.status).toBe('success')
        expect(sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('validates matching passwords', async () => {
        const result = await resetPasswordAction(
            initialState,
            createFormData({
                token: 'a'.repeat(43),
                password: 'new-password',
                passwordConfirmation: 'different-password',
            })
        )

        expect(result).toEqual({ status: 'error', message: 'Konfirmasi kata sandi tidak cocok.' })
        expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('rejects invalid or expired tokens before hashing the password', async () => {
        mockSupabaseClient.from.mockReturnValueOnce(new MockQueryBuilder(null))

        const result = await resetPasswordAction(
            initialState,
            createFormData({
                token: 'a'.repeat(43),
                password: 'new-password',
                passwordConfirmation: 'new-password',
            })
        )

        expect(result.message).toContain('tidak valid')
        expect(hashPassword).not.toHaveBeenCalled()
    })

    it('updates the password through the atomic database function', async () => {
        mockSupabaseClient.from.mockReturnValueOnce(new MockQueryBuilder({ id: 'token-id' }))

        const result = await resetPasswordAction(
            initialState,
            createFormData({
                token: 'a'.repeat(43),
                password: 'new-password',
                passwordConfirmation: 'new-password',
            })
        )

        expect(hashPassword).toHaveBeenCalledWith('new-password')
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
            'reset_password_with_token',
            expect.objectContaining({ p_password_hash: 'hashed-new-password' })
        )
        expect(result.status).toBe('success')
    })
})
