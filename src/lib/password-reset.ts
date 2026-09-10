import { createHash, randomBytes } from 'node:crypto'

export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30

export function createPasswordResetToken(): string {
    return randomBytes(32).toString('base64url')
}

export function hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export function getPasswordResetExpiry(now = new Date()): Date {
    return new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000)
}

export function buildPasswordResetUrl(token: string): string {
    // Dynamic access keeps this value runtime-configurable on Cloudflare instead
    // of inlining the NEXT_PUBLIC value from the build machine.
    const runtimeEnvironment = process.env
    const appUrl = runtimeEnvironment.NEXT_PUBLIC_APP_URL?.trim()

    if (!appUrl) {
        throw new Error('Missing NEXT_PUBLIC_APP_URL')
    }

    const resetUrl = new URL('/reset-password', appUrl)
    resetUrl.searchParams.set('token', token)

    return resetUrl.toString()
}
