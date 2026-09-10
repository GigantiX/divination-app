import { afterEach, describe, expect, it } from 'vitest'
import {
    PASSWORD_RESET_TOKEN_TTL_MINUTES,
    buildPasswordResetUrl,
    createPasswordResetToken,
    getPasswordResetExpiry,
    hashPasswordResetToken,
} from './password-reset'

describe('password reset utilities', () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

    afterEach(() => {
        if (originalAppUrl) {
            process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
        } else {
            delete process.env.NEXT_PUBLIC_APP_URL
        }
    })

    it('creates unique URL-safe tokens', () => {
        const firstToken = createPasswordResetToken()
        const secondToken = createPasswordResetToken()

        expect(firstToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
        expect(secondToken).not.toBe(firstToken)
    })

    it('hashes tokens without storing their plain value', () => {
        const token = 'example-reset-token'
        const hash = hashPasswordResetToken(token)

        expect(hash).toHaveLength(64)
        expect(hash).not.toContain(token)
        expect(hashPasswordResetToken(token)).toBe(hash)
    })

    it('creates a thirty minute expiry', () => {
        const now = new Date('2026-09-10T00:00:00.000Z')

        expect(getPasswordResetExpiry(now).getTime() - now.getTime()).toBe(
            PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000
        )
    })

    it('uses NEXT_PUBLIC_APP_URL for the reset link', () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://divination.axelabs.my.id/'

        expect(buildPasswordResetUrl('token-with_symbols')).toBe(
            'https://divination.axelabs.my.id/reset-password?token=token-with_symbols'
        )
    })

    it('rejects missing application URLs', () => {
        delete process.env.NEXT_PUBLIC_APP_URL

        expect(() => buildPasswordResetUrl('token')).toThrow('Missing NEXT_PUBLIC_APP_URL')
    })
})
