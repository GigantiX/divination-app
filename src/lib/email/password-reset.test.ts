import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendPasswordResetEmail } from './password-reset'

describe('password reset email', () => {
    const originalApiKey = process.env.RESEND_API_KEY
    const originalFromEmail = process.env.RESEND_FROM_EMAIL

    beforeEach(() => {
        process.env.RESEND_API_KEY = 're_test_key'
        process.env.RESEND_FROM_EMAIL = 'DIVINATION <no-reply@mail.axelabs.my.id>'
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    })

    afterEach(() => {
        if (originalApiKey) {
            process.env.RESEND_API_KEY = originalApiKey
        } else {
            delete process.env.RESEND_API_KEY
        }

        if (originalFromEmail) {
            process.env.RESEND_FROM_EMAIL = originalFromEmail
        } else {
            delete process.env.RESEND_FROM_EMAIL
        }

        vi.unstubAllGlobals()
    })

    it('sends a transactional email through the Resend API', async () => {
        await sendPasswordResetEmail({
            to: 'user@example.com',
            recipientName: 'Test User',
            resetUrl: 'https://example.com/reset-password?token=safe-token',
        })

        expect(fetch).toHaveBeenCalledWith(
            'https://api.resend.com/emails',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer re_test_key',
                }),
            })
        )

        const request = vi.mocked(fetch).mock.calls[0][1]
        const body = JSON.parse(String(request?.body))
        expect(body.from).toBe('DIVINATION <no-reply@mail.axelabs.my.id>')
        expect(body.to).toEqual(['user@example.com'])
        expect(body.text).toContain('safe-token')
    })

    it('escapes profile names in the HTML email', async () => {
        await sendPasswordResetEmail({
            to: 'user@example.com',
            recipientName: '<script>alert(1)</script>',
            resetUrl: 'https://example.com/reset-password?token=safe-token',
        })

        const request = vi.mocked(fetch).mock.calls[0][1]
        const body = JSON.parse(String(request?.body))
        expect(body.html).not.toContain('<script>alert(1)</script>')
        expect(body.html).toContain('&lt;script&gt;')
    })

    it('fails safely when server configuration is missing', async () => {
        delete process.env.RESEND_API_KEY

        await expect(
            sendPasswordResetEmail({
                to: 'user@example.com',
                recipientName: 'Test User',
                resetUrl: 'https://example.com/reset-password?token=safe-token',
            })
        ).rejects.toThrow('Missing Resend email configuration')
    })

    it('rejects unsuccessful Resend responses', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 422 }))

        await expect(
            sendPasswordResetEmail({
                to: 'user@example.com',
                recipientName: 'Test User',
                resetUrl: 'https://example.com/reset-password?token=safe-token',
            })
        ).rejects.toThrow('Resend request failed with status 422')
    })
})
